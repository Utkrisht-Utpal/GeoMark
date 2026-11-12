import React, { useState, useEffect, useCallback } from 'react';
import type { User, TodayAttendanceStatus, StudentAttendanceRecord, DeviceStatusData } from '../types';
import { api } from '../services/api';
import { getOrCreateDeviceUuid } from '../utils/device';
import {
  MapPin,
  Clock,
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  LogOut,
  RefreshCw,
  Loader2,
  Calendar,
  Trash2,
} from 'lucide-react';

interface StudentPortalProps {
  token: string;
  user: User;
  onLogout: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ token, user, onLogout }) => {
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatusData | null>(null);
  const [todayStatus, setTodayStatus] = useState<TodayAttendanceStatus | null>(null);
  const [history, setHistory] = useState<StudentAttendanceRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isBindingDevice, setIsBindingDevice] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [isClearingAttendance, setIsClearingAttendance] = useState(false);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const deviceUuid = getOrCreateDeviceUuid();

  const loadInitialData = useCallback(async () => {
    try {
      const [devRes, todayRes] = await Promise.all([
        api.getDeviceStatus(token, deviceUuid),
        api.getTodayAttendance(token),
      ]);
      setDeviceStatus(devRes.data);
      setTodayStatus(todayRes.data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load attendance status' });
    }
  }, [token, deviceUuid]);

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await api.getStudentHistory(token, 1, 15);
      setHistory(res.data.records);
    } catch (err: any) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [token]);

  useEffect(() => {
    loadInitialData();
    loadHistory();
  }, [loadInitialData, loadHistory]);

  // Handle first-time browser device binding
  const handleBindDevice = async () => {
    setIsBindingDevice(true);
    setFeedback(null);
    try {
      await api.bindDevice(token, deviceUuid);
      setFeedback({ type: 'success', message: 'This device is now registered to your student account!' });
      await loadInitialData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to bind device.' });
    } finally {
      setIsBindingDevice(false);
    }
  };

  const isWindowOpen = todayStatus?.windowStatus?.isOpen ?? false;
  const isMarkedToday = todayStatus?.isMarked ?? false;
  const isDeviceBound = deviceStatus?.isBound ?? false;
  const isCurrentDevice = deviceStatus?.isCurrentDevice;
  const isDeviceMismatch = isDeviceBound && isCurrentDevice === false;

  // Mark attendance using HTML5 Geolocation API
  const handleMarkAttendance = async () => {
    setFeedback(null);

    // 1. Authoritative window re-check before any client action
    try {
      const windowCheck = await api.getAttendanceWindow(token);
      if (!windowCheck.data.isOpen) {
        setFeedback({
          type: 'warning',
          message: windowCheck.data.reason || 'Attendance window is currently closed.',
        });
        await loadInitialData();
        return;
      }
    } catch {
      if (!isWindowOpen) {
        setFeedback({
          type: 'warning',
          message: todayStatus?.windowStatus?.reason || 'Attendance window is currently closed.',
        });
        return;
      }
    }

    // 2. Pre-check device status: Do NOT request GPS if device is mismatched or unbound
    if (isDeviceMismatch) {
      setFeedback({
        type: 'error',
        message: 'Device mismatch: Attendance must be marked from your registered device. Please contact your hostel warden to reset your device binding.',
      });
      return;
    }

    if (!isDeviceBound) {
      setFeedback({
        type: 'warning',
        message: 'Please register this device first before marking attendance.',
      });
      return;
    }

    if (!navigator.geolocation) {
      setFeedback({
        type: 'error',
        message: 'Geolocation is not supported by your browser. Please use a modern mobile or desktop browser.',
      });
      return;
    }

    setIsMarking(true);
    setGpsStatusMessage('Requesting GPS satellite fix from browser...');

    // Request high accuracy location fix once
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGpsStatusMessage(`GPS fix acquired (±${Math.round(accuracy)}m). Verifying geofence with server...`);

        try {
          const res = await api.markAttendance(token, {
            deviceUuid,
            latitude,
            longitude,
            accuracy,
          });

          setFeedback({
            type: 'success',
            message: `Attendance marked successfully at ${res.data.markedTime}! Distance from hostel center: ${res.data.distanceMeters}m (GPS Accuracy: ±${Math.round(res.data.accuracyMeters)}m).`,
          });
          await loadInitialData();
          await loadHistory();
        } catch (err: any) {
          setFeedback({
            type: 'error',
            message: err.message || 'Attendance submission rejected by server.',
          });
        } finally {
          setIsMarking(false);
          setGpsStatusMessage(null);
        }
      },
      (geoError) => {
        setIsMarking(false);
        setGpsStatusMessage(null);
        let errorText = 'Unable to retrieve location.';
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            errorText = 'Location permission was denied. Please allow location access in your browser settings to mark attendance.';
            break;
          case geoError.POSITION_UNAVAILABLE:
            errorText = 'Location information is currently unavailable. Please check your device GPS.';
            break;
          case geoError.TIMEOUT:
            errorText = 'Location request timed out. Please try again.';
            break;
        }
        setFeedback({ type: 'error', message: errorText });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const handleClearAllAttendance = async () => {
    if (!confirm('Testing Utility: Delete all attendance records from database? You will be able to mark attendance again.')) {
      return;
    }
    setIsClearingAttendance(true);
    try {
      const res = await api.clearAllAttendance(token);
      setFeedback({
        type: 'success',
        message: res.message || 'All attendance records cleared from database! You can now mark attendance again.',
      });
      await loadInitialData();
      await loadHistory();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to clear attendance records.',
      });
    } finally {
      setIsClearingAttendance(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">GeoMark</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                Student Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClearAllAttendance}
              disabled={isClearingAttendance}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Testing Utility: Delete all attendance records from database to test again"
            >
              {isClearingAttendance ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-rose-600" />}
              <span className="hidden sm:inline">Reset Attendance Data (Test)</span>
              <span className="sm:hidden">Reset (Test)</span>
            </button>
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-800">{user.fullName}</div>
              <div className="text-xs text-slate-500">
                {user.rollNumber} • {user.hostelName} {user.roomNumber ? `(${user.roomNumber})` : ''}
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* Banner Feedback Messages */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : feedback.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : feedback.type === 'warning' ? (
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="text-sm font-medium flex-1">{feedback.message}</div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs font-semibold opacity-60 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Tile 1: Attendance Window Status */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-indigo-600" />
                  Time Window (IST)
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    isWindowOpen
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isWindowOpen ? 'WINDOW OPEN' : 'CLOSED'}
                </span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {todayStatus?.windowStatus?.opensAt || '07:30 PM'} – {todayStatus?.windowStatus?.closesAt || '11:00 PM'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Server Time: {todayStatus?.windowStatus?.serverTimeIst || '--:--:--'} IST
              </p>
            </div>
            {!isWindowOpen ? (
              <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800 font-medium flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Attendance window is currently closed.</p>
                  <p className="text-amber-700 text-[11px] mt-0.5">
                    {todayStatus?.windowStatus?.reason || `Submissions accepted strictly between ${todayStatus?.windowStatus?.opensAt || '07:30 PM'} and ${todayStatus?.windowStatus?.closesAt || '11:00 PM'} IST.`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Attendance window is open! You may mark attendance now.</span>
              </div>
            )}
          </div>

          {/* Tile 2: Device Registration Status */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-indigo-600" />
                  Device Binding
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    !isDeviceBound
                      ? 'bg-slate-100 text-slate-700'
                      : isDeviceMismatch
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {!isDeviceBound ? 'NOT BOUND' : isDeviceMismatch ? 'DEVICE MISMATCH' : 'BOUND & VERIFIED'}
                </span>
              </div>
              <div className="text-base font-semibold text-slate-800">
                {!isDeviceBound
                  ? 'No Device Registered'
                  : isDeviceMismatch
                  ? 'Unrecognized Device'
                  : 'Registered Browser Device'}
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate" title={deviceUuid}>
                Current Token: {deviceUuid.substring(0, 16)}...
              </p>
            </div>

            {!isDeviceBound ? (
              <button
                type="button"
                onClick={handleBindDevice}
                disabled={isBindingDevice}
                className="mt-3 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isBindingDevice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Register Current Device
              </button>
            ) : isDeviceMismatch ? (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                <p className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                  Device Mismatch Detected
                </p>
                <p className="mt-1 text-[11px] text-rose-700">
                  This browser is not registered to your account. Ask your hostel warden to reset your device binding to use this browser.
                </p>
              </div>
            ) : (
              <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg mt-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Device verified and authorized for attendance.
              </p>
            )}
          </div>

          {/* Tile 3: Today's Status */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  Today's Status
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    isMarkedToday
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {isMarkedToday ? 'PRESENT' : 'NOT MARKED'}
                </span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {isMarkedToday ? todayStatus?.attendance?.marked_time : 'Pending'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {todayStatus?.windowStatus?.serverDateIst}
              </p>
            </div>
            {isMarkedToday && (
              <div className="mt-3 flex flex-col gap-2">
                <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Marked inside {todayStatus?.attendance?.hostel_name} ({todayStatus?.attendance?.distance_meters}m)
                </div>
                <button
                  type="button"
                  onClick={handleClearAllAttendance}
                  disabled={isClearingAttendance}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline flex items-center gap-1 cursor-pointer self-start"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear attendance to test again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Card: Mark Attendance */}
        <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-700/60 text-indigo-200 mb-3 border border-indigo-500/30">
              <MapPin className="h-3.5 w-3.5" />
              GPS Geofence Attendance
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Mark Your Daily Attendance
            </h2>
            <p className="mt-2 text-sm text-indigo-200">
              Your browser will capture your current GPS coordinates and securely transmit them to the server for verification against your assigned hostel premises ({user.hostelName}).
            </p>

            {/* Notice when window is closed */}
            {!isWindowOpen && (
              <div className="mt-4 p-3 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-100 text-xs flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-300 shrink-0" />
                <span>
                  <strong>Attendance window is currently closed.</strong> Submissions are accepted only between {todayStatus?.windowStatus?.opensAt || '07:30 PM'} and {todayStatus?.windowStatus?.closesAt || '11:00 PM'} IST.
                </span>
              </div>
            )}

            {/* Notice when device is mismatched */}
            {isDeviceMismatch && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/20 border border-rose-400/30 text-rose-100 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-300 shrink-0" />
                <span>
                  <strong>Device Mismatch:</strong> This browser token does not match your registered device. Please contact your hostel warden to reset your device binding.
                </span>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleMarkAttendance}
                disabled={isMarking || isMarkedToday || !isDeviceBound || isDeviceMismatch || !isWindowOpen}
                className="py-3 px-6 rounded-xl font-bold text-sm bg-white text-indigo-900 hover:bg-indigo-50 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {isMarking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    Acquiring GPS Fix...
                  </>
                ) : isMarkedToday ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Already Marked Present Today
                  </>
                ) : !isWindowOpen ? (
                  <>
                    <Clock className="h-4 w-4 text-amber-600" />
                    Attendance Window Closed
                  </>
                ) : isDeviceMismatch ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    Device Mismatch (Contact Warden)
                  </>
                ) : !isDeviceBound ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Register Device First
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 text-indigo-600" />
                    Mark Attendance Now
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  loadInitialData();
                  loadHistory();
                }}
                className="py-3 px-4 rounded-xl text-sm font-medium bg-indigo-800/80 hover:bg-indigo-700/80 text-indigo-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Refresh Status"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

              <button
                type="button"
                onClick={handleClearAllAttendance}
                disabled={isClearingAttendance}
                className="py-3 px-4 rounded-xl text-sm font-semibold bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-400/40 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                title="Testing Utility: Delete all attendance records from database to test again"
              >
                {isClearingAttendance ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Reset All Attendance (Testing)
              </button>
            </div>

            {gpsStatusMessage && (
              <p className="mt-4 text-xs font-mono text-indigo-200 bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-400/20 inline-block animate-pulse">
                {gpsStatusMessage}
              </p>
            )}
          </div>
        </div>

        {/* Attendance History Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-600" />
              <h3 className="font-bold text-lg text-slate-900">Personal Attendance History</h3>
            </div>
            <button
              onClick={loadHistory}
              disabled={isLoadingHistory}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
              Reload
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="py-12 flex justify-center items-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              No previous attendance records recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Marked Time</th>
                    <th className="py-3 px-4">Distance from Center</th>
                    <th className="py-3 px-4">GPS Accuracy</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((record) => (
                    <tr key={record.attendance_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-800">{record.attendance_date}</td>
                      <td className="py-3 px-4 text-slate-600">{record.marked_time}</td>
                      <td className="py-3 px-4 text-slate-600">{record.distance_meters} meters</td>
                      <td className="py-3 px-4 text-slate-600">±{Math.round(record.accuracy_meters)}m</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
