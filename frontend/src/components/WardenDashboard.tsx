import React, { useState, useEffect, useCallback } from 'react';
import type {
  User,
  WardenHostelOverview,
  StudentDetailHistory,
  ManagedStudent,
  RoomItem,
  ImportPreviewResponse,
  DailyTrendItem,
  RoomTurnoutItem,
  StudentInsightItem,
} from '../types';
import { api } from '../services/api';
import {
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Search,
  Calendar,
  LogOut,
  RefreshCw,
  Loader2,
  MapPin,
  Smartphone,
  Eye,
  X,
  CheckCircle2,
  XCircle,
  Plus,
  FileSpreadsheet,
  Download,
  Upload,
  DoorClosed,
  BarChart3,
  AlertTriangle,
  Edit2,
  ArrowRight,
  Compass,
  Trash2,
} from 'lucide-react';
import { HostelGeofenceSettings } from './HostelGeofenceSettings';

interface WardenDashboardProps {
  token: string;
  user: User;
  onLogout: () => void;
}

type TabType = 'dashboard' | 'students' | 'rooms' | 'attendance' | 'reports' | 'geofence';

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export const WardenDashboard: React.FC<WardenDashboardProps> = ({ token, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // --------------------------------------------------------------------------
  // Tab 1 & Tab 4: Overview & Daily Attendance State
  // --------------------------------------------------------------------------
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [overview, setOverview] = useState<WardenHostelOverview | null>(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);
  const [isClearingAttendance, setIsClearingAttendance] = useState(false);
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<StudentDetailHistory | null>(null);
  const [isResettingDevice, setIsResettingDevice] = useState(false);
  const [resetReason, setResetReason] = useState('Student replaced mobile handset');

  // --------------------------------------------------------------------------
  // Tab 2: Students Roster State
  // --------------------------------------------------------------------------
  const [studentsList, setStudentsList] = useState<ManagedStudent[]>([]);
  const [studentsTotal, setStudentsTotal] = useState(0);
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsTotalPages, setStudentsTotalPages] = useState(1);
  const [studentsSearch, setStudentsSearch] = useState('');
  const [studentsStatusFilter, setStudentsStatusFilter] = useState<string>('');
  const [studentsRoomFilter, setStudentsRoomFilter] = useState<number | undefined>(undefined);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);

  // Student Add / Edit Modals
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentData, setNewStudentData] = useState({
    rollNumber: '',
    fullName: '',
    email: '',
    roomId: null as number | null,
    password: '',
  });
  const [createdStudentResult, setCreatedStudentResult] = useState<{ student: ManagedStudent; initialPassword: string } | null>(null);

  const [editingStudent, setEditingStudent] = useState<ManagedStudent | null>(null);
  const [editStudentData, setEditStudentData] = useState({
    fullName: '',
    email: '',
    roomId: null as number | null,
    newPassword: '',
  });

  // Excel Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewResponse | null>(null);
  const [isImportPreviewing, setIsImportPreviewing] = useState(false);
  const [isImportConfirming, setIsImportConfirming] = useState(false);

  // --------------------------------------------------------------------------
  // Tab 3: Rooms State
  // --------------------------------------------------------------------------
  const [roomsList, setRoomsList] = useState<RoomItem[]>([]);
  const [isRoomsLoading, setIsRoomsLoading] = useState(false);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ roomNumber: '', floorNumber: 1, capacity: 2 });
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null);
  const [editRoomData, setEditRoomData] = useState({ roomNumber: '', floorNumber: 1, capacity: 2 });

  // --------------------------------------------------------------------------
  // Tab 5: Reports State
  // --------------------------------------------------------------------------
  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [trendsData, setTrendsData] = useState<DailyTrendItem[]>([]);
  const [roomTurnoutData, setRoomTurnoutData] = useState<RoomTurnoutItem[]>([]);
  const [insightsData, setInsightsData] = useState<StudentInsightItem[]>([]);
  const [isReportsLoading, setIsReportsLoading] = useState(false);

  // ==========================================================================
  // Data Loaders
  // ==========================================================================
  const loadOverview = useCallback(async () => {
    setIsOverviewLoading(true);
    try {
      const res = await api.getWardenOverview(token, selectedDate);
      setOverview(res.data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load attendance overview.' });
    } finally {
      setIsOverviewLoading(false);
    }
  }, [token, selectedDate]);

  const handleClearAllAttendance = async () => {
    if (!confirm('Testing Utility: Delete all student attendance records from the database? Students will be able to mark attendance again.')) {
      return;
    }
    setIsClearingAttendance(true);
    try {
      const res = await api.clearAllAttendance(token, true);
      setFeedback({ type: 'success', message: res.message || 'All attendance records cleared successfully!' });
      await loadOverview();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to clear attendance records.' });
    } finally {
      setIsClearingAttendance(false);
    }
  };

  const loadRooms = useCallback(async () => {
    setIsRoomsLoading(true);
    try {
      const res = await api.getRooms(token);
      setRoomsList(res.data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load rooms.' });
    } finally {
      setIsRoomsLoading(false);
    }
  }, [token]);

  const loadStudents = useCallback(async () => {
    setIsStudentsLoading(true);
    try {
      const res = await api.getStudents(token, {
        page: studentsPage,
        limit: 10,
        search: studentsSearch || undefined,
        status: studentsStatusFilter || undefined,
        roomId: studentsRoomFilter || undefined,
      });
      setStudentsList(res.data.students);
      setStudentsTotal(res.data.total);
      setStudentsTotalPages(res.data.totalPages);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load student roster.' });
    } finally {
      setIsStudentsLoading(false);
    }
  }, [token, studentsPage, studentsSearch, studentsStatusFilter, studentsRoomFilter]);

  const loadReports = useCallback(async () => {
    setIsReportsLoading(true);
    try {
      const [trendsRes, roomsRes, insightsRes] = await Promise.all([
        api.getTrends(token, 14),
        api.getRoomAttendance(token),
        api.getStudentInsights(token, 30, 75),
      ]);
      setTrendsData(trendsRes.data);
      setRoomTurnoutData(roomsRes.data);
      setInsightsData(insightsRes.data.lowAttendanceStudents);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load report analytics.' });
    } finally {
      setIsReportsLoading(false);
    }
  }, [token]);

  // Initial tab loading
  useEffect(() => {
    loadRooms();
    loadOverview();
  }, [loadRooms, loadOverview]);

  useEffect(() => {
    if (activeTab === 'students') {
      loadStudents();
    } else if (activeTab === 'rooms') {
      loadRooms();
    } else if (activeTab === 'dashboard' || activeTab === 'reports') {
      loadReports();
    }
  }, [activeTab, loadStudents, loadRooms, loadReports]);

  // --------------------------------------------------------------------------
  // Handlers: Student Actions
  // --------------------------------------------------------------------------
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createStudent(token, {
        rollNumber: newStudentData.rollNumber,
        fullName: newStudentData.fullName,
        email: newStudentData.email,
        roomId: newStudentData.roomId || null,
        password: newStudentData.password || undefined,
      });
      setCreatedStudentResult(res.data);
      setFeedback({ type: 'success', message: 'Student account created successfully.' });
      loadStudents();
      loadRooms();
      setNewStudentData({ rollNumber: '', fullName: '', email: '', roomId: null, password: '' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create student.' });
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      await api.updateStudent(token, editingStudent.student_id, {
        fullName: editStudentData.fullName || undefined,
        email: editStudentData.email || undefined,
        roomId: editStudentData.roomId,
        newPassword: editStudentData.newPassword || undefined,
      });
      setFeedback({ type: 'success', message: 'Student details updated successfully.' });
      setEditingStudent(null);
      loadStudents();
      loadRooms();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update student.' });
    }
  };

  const handleToggleStudentStatus = async (student: ManagedStudent, newStatus: 'ACTIVE' | 'SUSPENDED' | 'ALUMNI') => {
    if (!confirm(`Are you sure you want to change ${student.full_name}'s status to ${newStatus}?`)) return;
    try {
      await api.updateStudentStatus(token, student.student_id, newStatus);
      setFeedback({ type: 'success', message: `Student status updated to ${newStatus}.` });
      loadStudents();
      loadOverview();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update student status.' });
    }
  };

  // --------------------------------------------------------------------------
  // Handlers: Excel Import
  // --------------------------------------------------------------------------
  const handleDownloadTemplate = async () => {
    try {
      const blob = await api.downloadImportTemplate(token);
      downloadBlob(blob, 'GeoMark_Student_Import_Template.xlsx');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to download template.' });
    }
  };

  const handlePreviewUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      alert('Please choose an Excel (.xlsx/.xls) file to upload.');
      return;
    }
    setIsImportPreviewing(true);
    setFeedback(null);
    try {
      const res = await api.previewImport(token, importFile);
      setImportPreview(res.data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to parse Excel file.' });
    } finally {
      setIsImportPreviewing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setIsImportConfirming(true);
    try {
      const res = await api.confirmImport(token, importPreview.previewId);
      setFeedback({ type: 'success', message: res.data.message });
      setIsImportModalOpen(false);
      setImportFile(null);
      setImportPreview(null);
      loadStudents();
      loadRooms();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to confirm import.' });
    } finally {
      setIsImportConfirming(false);
    }
  };

  // --------------------------------------------------------------------------
  // Handlers: Excel Exports
  // --------------------------------------------------------------------------
  const handleExportRoster = async () => {
    try {
      const blob = await api.exportStudents(token, {
        search: studentsSearch || undefined,
        status: studentsStatusFilter || undefined,
        roomId: studentsRoomFilter || undefined,
      });
      downloadBlob(blob, `GeoMark_Students_Hostel${user.hostelId}.xlsx`);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to export students roster.' });
    }
  };

  const handleExportDailyAttendance = async () => {
    try {
      const blob = await api.exportDailyAttendance(token, selectedDate);
      downloadBlob(blob, `GeoMark_Attendance_${selectedDate}.xlsx`);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to export daily attendance.' });
    }
  };

  const handleExportRangeReport = async () => {
    try {
      const blob = await api.exportDateRangeAttendance(token, reportStartDate, reportEndDate);
      downloadBlob(blob, `GeoMark_AttendanceReport_${reportStartDate}_to_${reportEndDate}.xlsx`);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to export date range report.' });
    }
  };

  // --------------------------------------------------------------------------
  // Handlers: Room Actions
  // --------------------------------------------------------------------------
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createRoom(token, {
        roomNumber: newRoomData.roomNumber,
        floorNumber: Number(newRoomData.floorNumber),
        capacity: Number(newRoomData.capacity),
      });
      setFeedback({ type: 'success', message: `Room ${newRoomData.roomNumber} created successfully.` });
      setIsAddRoomOpen(false);
      setNewRoomData({ roomNumber: '', floorNumber: 1, capacity: 2 });
      loadRooms();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create room.' });
    }
  };

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    try {
      await api.updateRoom(token, editingRoom.room_id, {
        roomNumber: editRoomData.roomNumber || undefined,
        floorNumber: Number(editRoomData.floorNumber),
        capacity: Number(editRoomData.capacity),
      });
      setFeedback({ type: 'success', message: 'Room updated successfully.' });
      setEditingRoom(null);
      loadRooms();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update room.' });
    }
  };

  const handleToggleRoomStatus = async (room: RoomItem) => {
    const targetStatus = !room.is_active;
    if (!confirm(`Are you sure you want to mark Room ${room.room_number} as ${targetStatus ? 'ACTIVE' : 'INACTIVE'}?`)) return;
    try {
      await api.updateRoomStatus(token, room.room_id, targetStatus);
      setFeedback({ type: 'success', message: `Room ${room.room_number} status updated.` });
      loadRooms();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update room status.' });
    }
  };

  // --------------------------------------------------------------------------
  // Handlers: Attendance View & Device Reset
  // --------------------------------------------------------------------------
  const handleViewStudentHistory = async (studentId: number) => {
    try {
      const res = await api.getWardenStudentHistory(token, studentId);
      setSelectedStudentHistory(res.data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to fetch student details.' });
    }
  };

  const handleResetDevice = async (studentId: number) => {
    if (!resetReason.trim()) {
      alert('Please enter a reason for resetting this device binding.');
      return;
    }
    setIsResettingDevice(true);
    try {
      const res = await api.resetStudentDevice(token, studentId, resetReason);
      setFeedback({ type: 'success', message: res.message });
      await handleViewStudentHistory(studentId);
      await loadOverview();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to reset device binding.' });
    } finally {
      setIsResettingDevice(false);
    }
  };

  const filteredAttendanceStudents = (overview?.students || []).filter(
    (s) =>
      s.roll_number.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
      s.full_name.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
      (s.room_number && s.room_number.toLowerCase().includes(attendanceSearch.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900">GeoMark</span>
                <span className="text-xs bg-indigo-100 text-indigo-700 font-medium px-2 py-0.5 rounded-full">
                  Warden Portal
                </span>
              </div>
              <p className="text-xs text-slate-500">{overview?.hostelName || 'Assigned Hostel'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">{user.fullName || user.username}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-2 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-3 px-4 font-medium text-sm border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`py-3 px-4 font-medium text-sm border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'students'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="h-4 w-4" />
            Students Roster
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`py-3 px-4 font-medium text-sm border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'rooms'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <DoorClosed className="h-4 w-4" />
            Rooms
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-3 px-4 font-medium text-sm border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Daily Attendance
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-3 px-4 font-medium text-sm border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'reports'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Advanced Reports
          </button>
          <button
            onClick={() => setActiveTab('geofence')}
            className={`py-3 px-4 font-medium text-sm border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'geofence'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Compass className="h-4 w-4" />
            Hostel Geofence
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center justify-between border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="text-sm font-medium">{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 1: DASHBOARD OVERVIEW                                        */}
        {/* ================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Enrolled</span>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">{overview?.summary.totalStudents || 0}</p>
                <p className="text-xs text-slate-400 mt-1">Active hostel residents</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Present Today</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <UserCheck className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-emerald-600 mt-2">{overview?.summary.presentCount || 0}</p>
                <p className="text-xs text-slate-400 mt-1">Authoritatively verified</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Absent Today</span>
                  <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                    <UserX className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-red-600 mt-2">{overview?.summary.absentCount || 0}</p>
                <p className="text-xs text-slate-400 mt-1">Missing submission</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Turnout Rate</span>
                  <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-sky-600 mt-2">
                  {overview?.summary.attendanceRate !== undefined ? `${overview.summary.attendanceRate}%` : '0%'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Today's attendance percentage</p>
              </div>
            </div>

            {/* Quick Actions & 7-Day Trend Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 14-Day Attendance Trend Bars */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900">Attendance Turnout Trend</h3>
                    <p className="text-xs text-slate-500">Daily attendance percentage over recent sessions</p>
                  </div>
                  <button
                    onClick={loadReports}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>

                {isReportsLoading ? (
                  <div className="h-48 flex items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading trend metrics...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trendsData.slice(-7).map((item) => (
                      <div key={item.date} className="flex items-center gap-3">
                        <span className="text-xs font-medium text-slate-500 w-24">{item.date}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden flex">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${item.rate}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-12 text-right">{item.rate}%</span>
                        <span className="text-xs text-slate-400 w-16 text-right">
                          {item.presentCount}/{item.totalStudents}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Low Attendance Insights Alert */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-600 mb-2">
                    <AlertTriangle className="h-5 w-5" />
                    <h3 className="font-bold text-slate-900">Low Attendance Alerts</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">
                    Students with attendance rate below 75% in the last 30 days
                  </p>

                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {insightsData.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No low attendance students flagged. Excellent turnout!</p>
                    ) : (
                      insightsData.slice(0, 5).map((student) => (
                        <div
                          key={student.studentId}
                          className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/60 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{student.fullName}</p>
                            <p className="text-[11px] text-slate-500">
                              {student.rollNumber} {student.roomNumber ? `• Rm ${student.roomNumber}` : ''}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                            {student.attendanceRate}%
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setActiveTab('reports')}
                    className="w-full text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    View Full Attendance Report
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: STUDENTS ROSTER                                           */}
        {/* ================================================================= */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by roll, name, email..."
                    value={studentsSearch}
                    onChange={(e) => {
                      setStudentsSearch(e.target.value);
                      setStudentsPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <select
                  value={studentsStatusFilter}
                  onChange={(e) => {
                    setStudentsStatusFilter(e.target.value);
                    setStudentsPage(1);
                  }}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="ALUMNI">Alumni</option>
                </select>

                <select
                  value={studentsRoomFilter || ''}
                  onChange={(e) => {
                    setStudentsRoomFilter(e.target.value ? Number(e.target.value) : undefined);
                    setStudentsPage(1);
                  }}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Rooms</option>
                  {roomsList.map((r) => (
                    <option key={r.room_id} value={r.room_id}>
                      Room {r.room_number} (Floor {r.floor_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportRoster}
                  className="px-3 py-2 text-sm font-medium border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="h-4 w-4 text-slate-500" />
                  Export Excel
                </button>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-3 py-2 text-sm font-medium border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Import Excel
                </button>
                <button
                  onClick={() => setIsAddStudentOpen(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  Add Student
                </button>
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/75 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                    <tr>
                      <th className="px-6 py-3.5">Roll Number</th>
                      <th className="px-6 py-3.5">Student Name</th>
                      <th className="px-6 py-3.5">Email</th>
                      <th className="px-6 py-3.5">Room</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Device Bound</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isStudentsLoading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                          Loading students roster...
                        </td>
                      </tr>
                    ) : studentsList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                          No students found matching the criteria.
                        </td>
                      </tr>
                    ) : (
                      studentsList.map((student) => (
                        <tr key={student.student_id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3.5 font-semibold text-slate-900">{student.roll_number}</td>
                          <td className="px-6 py-3.5 font-medium text-slate-800">{student.full_name}</td>
                          <td className="px-6 py-3.5 text-slate-500">{student.email}</td>
                          <td className="px-6 py-3.5">
                            {student.room_number ? (
                              <span className="font-medium text-slate-700">Room {student.room_number}</span>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                student.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : student.status === 'SUSPENDED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {student.status}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            {student.is_device_bound ? (
                              <span className="inline-flex items-center gap-1 text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-medium">
                                <Smartphone className="h-3 w-3" />
                                Bound
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">Not Bound</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingStudent(student);
                                  setEditStudentData({
                                    fullName: student.full_name,
                                    email: student.email,
                                    roomId: student.room_id,
                                    newPassword: '',
                                  });
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                                title="Edit Student"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handleToggleStudentStatus(
                                    student,
                                    student.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
                                  )
                                }
                                className={`text-xs px-2 py-1 rounded-md font-medium cursor-pointer ${
                                  student.status === 'ACTIVE'
                                    ? 'text-red-700 bg-red-50 hover:bg-red-100'
                                    : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                }`}
                              >
                                {student.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {studentsList.length} of {studentsTotal} students
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={studentsPage <= 1}
                    onClick={() => setStudentsPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span>
                    Page {studentsPage} of {studentsTotalPages || 1}
                  </span>
                  <button
                    disabled={studentsPage >= studentsTotalPages}
                    onClick={() => setStudentsPage((p) => p + 1)}
                    className="px-2.5 py-1 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: ROOMS MANAGEMENT                                          */}
        {/* ================================================================= */}
        {activeTab === 'rooms' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h3 className="font-bold text-slate-900">Hostel Rooms & Occupancy</h3>
                <p className="text-xs text-slate-500">Manage room allocations and track bed capacity</p>
              </div>
              <button
                onClick={() => setIsAddRoomOpen(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" />
                Add Room
              </button>
            </div>

            {isRoomsLoading ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Loading rooms...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {roomsList.map((room) => {
                  const isFull = room.available_beds <= 0;
                  const isActive = Boolean(room.is_active);

                  return (
                    <div
                      key={room.room_id}
                      className={`bg-white p-5 rounded-2xl border transition-all ${
                        !isActive
                          ? 'border-slate-200 opacity-60 bg-slate-50/50'
                          : isFull
                          ? 'border-amber-200'
                          : 'border-slate-200 hover:border-indigo-300'
                      } shadow-xs`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-lg text-slate-900">Room {room.room_number}</h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">Floor {room.floor_number}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingRoom(room);
                              setEditRoomData({
                                roomNumber: room.room_number,
                                floorNumber: room.floor_number,
                                capacity: room.capacity,
                              });
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                            title="Edit Room"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Capacity:</span>
                          <span className="font-semibold text-slate-800">{room.capacity} Beds</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Active Occupants:</span>
                          <span className="font-semibold text-indigo-600">{room.current_occupancy} Students</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Available Beds:</span>
                          <span className={`font-semibold ${isFull ? 'text-red-500' : 'text-emerald-600'}`}>
                            {room.available_beds} Available
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isFull ? 'bg-red-500' : 'bg-indigo-600'
                            }`}
                            style={{
                              width: `${Math.min(100, (room.current_occupancy / room.capacity) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => handleToggleRoomStatus(room)}
                          className={`text-xs font-semibold cursor-pointer ${
                            isActive ? 'text-red-600 hover:text-red-800' : 'text-emerald-600 hover:text-emerald-800'
                          }`}
                        >
                          {isActive ? 'Deactivate Room' : 'Activate Room'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: DAILY ATTENDANCE                                          */}
        {/* ================================================================= */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            {/* Filter & Export Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Calendar className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={loadOverview}
                  className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative min-w-[200px]">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search attendance..."
                    value={attendanceSearch}
                    onChange={(e) => setAttendanceSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={handleExportDailyAttendance}
                  className="px-3 py-2 text-sm font-medium border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <Download className="h-4 w-4 text-slate-500" />
                  Export Daily Excel
                </button>

                <button
                  onClick={handleClearAllAttendance}
                  disabled={isClearingAttendance}
                  className="px-3 py-2 text-sm font-medium border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap disabled:opacity-50"
                  title="Testing utility: Delete all attendance records from database to test again"
                >
                  {isClearingAttendance ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-rose-600" />}
                  Clear Attendance (Testing)
                </button>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/75 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                    <tr>
                      <th className="px-6 py-3.5">Roll Number</th>
                      <th className="px-6 py-3.5">Student Name</th>
                      <th className="px-6 py-3.5">Room</th>
                      <th className="px-6 py-3.5">Attendance Status</th>
                      <th className="px-6 py-3.5">Time (IST)</th>
                      <th className="px-6 py-3.5">Distance</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isOverviewLoading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                          Loading attendance records...
                        </td>
                      </tr>
                    ) : filteredAttendanceStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                          No attendance records found for this date.
                        </td>
                      </tr>
                    ) : (
                      filteredAttendanceStudents.map((student) => (
                        <tr key={student.student_id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3.5 font-semibold text-slate-900">{student.roll_number}</td>
                          <td className="px-6 py-3.5 font-medium text-slate-800">{student.full_name}</td>
                          <td className="px-6 py-3.5">
                            {student.room_number ? (
                              <span className="font-medium text-slate-700">Room {student.room_number}</span>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                student.attendance_status === 'PRESENT'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {student.attendance_status}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-slate-500">{student.marked_time || '-'}</td>
                          <td className="px-6 py-3.5 text-slate-500">
                            {student.distance_meters !== null ? `${Number(student.distance_meters).toFixed(1)}m` : '-'}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <button
                              onClick={() => handleViewStudentHistory(student.student_id)}
                              className="text-indigo-600 hover:text-indigo-800 font-medium text-xs flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: ADVANCED REPORTS                                           */}
        {/* ================================================================= */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Date Range Picker & Export */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 uppercase">Report Range:</span>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <button
                onClick={handleExportRangeReport}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Download className="h-4 w-4" />
                Export Range Report (Excel)
              </button>
            </div>

            {/* Room-wise Turnout Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-900">Room-Wise Attendance Performance</h3>
                <p className="text-xs text-slate-500">Breakdown of turnout per room in your hostel</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/75 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                    <tr>
                      <th className="px-6 py-3.5">Room</th>
                      <th className="px-6 py-3.5">Floor</th>
                      <th className="px-6 py-3.5">Capacity</th>
                      <th className="px-6 py-3.5">Occupants</th>
                      <th className="px-6 py-3.5">Present</th>
                      <th className="px-6 py-3.5">Absent</th>
                      <th className="px-6 py-3.5">Turnout %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roomTurnoutData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                          No room data available.
                        </td>
                      </tr>
                    ) : (
                      roomTurnoutData.map((room) => (
                        <tr key={room.roomId} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3.5 font-bold text-slate-900">Room {room.roomNumber}</td>
                          <td className="px-6 py-3.5 text-slate-500">Floor {room.floorNumber}</td>
                          <td className="px-6 py-3.5">{room.capacity}</td>
                          <td className="px-6 py-3.5 font-semibold text-indigo-600">{room.totalStudents}</td>
                          <td className="px-6 py-3.5 text-emerald-600 font-medium">{room.presentCount}</td>
                          <td className="px-6 py-3.5 text-red-500 font-medium">{room.absentCount}</td>
                          <td className="px-6 py-3.5">
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                                room.rate >= 80
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : room.rate >= 50
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {room.rate}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 6: HOSTEL GEOFENCE SETTINGS                                     */}
        {/* =================================================================== */}
        {activeTab === 'geofence' && <HostelGeofenceSettings token={token} />}
      </main>

      {/* =================================================================== */}
      {/* MODAL: ADD STUDENT                                                  */}
      {/* =================================================================== */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Add New Student</h3>
              <button
                onClick={() => {
                  setIsAddStudentOpen(false);
                  setCreatedStudentResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createdStudentResult ? (
              <div className="py-4 space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
                  <p className="font-semibold text-sm">Student Created Successfully!</p>
                  <p className="text-xs mt-1">Please record this temporary credential for the student:</p>
                  <div className="mt-3 p-2 bg-white rounded-lg border border-emerald-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">Initial Password:</p>
                      <p className="font-mono font-bold text-sm text-indigo-600">{createdStudentResult.initialPassword}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsAddStudentOpen(false);
                    setCreatedStudentResult(null);
                  }}
                  className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-xl text-sm cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateStudent} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Roll Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2024CS101"
                    value={newStudentData.rollNumber}
                    onChange={(e) => setNewStudentData({ ...newStudentData, rollNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Sharma"
                    value={newStudentData.fullName}
                    onChange={(e) => setNewStudentData({ ...newStudentData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. aarav.sharma@example.com"
                    value={newStudentData.email}
                    onChange={(e) => setNewStudentData({ ...newStudentData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Room (Optional)</label>
                  <select
                    value={newStudentData.roomId || ''}
                    onChange={(e) =>
                      setNewStudentData({
                        ...newStudentData,
                        roomId: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">No Room Assigned</option>
                    {roomsList
                      .filter((r) => r.is_active && r.available_beds > 0)
                      .map((r) => (
                        <option key={r.room_id} value={r.room_id}>
                          Room {r.room_number} ({r.available_beds} beds available)
                        </option>
                      ))}
                  </select>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddStudentOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 cursor-pointer"
                  >
                    Create Student
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: EDIT STUDENT                                                 */}
      {/* =================================================================== */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Edit Student — {editingStudent.roll_number}</h3>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editStudentData.fullName}
                  onChange={(e) => setEditStudentData({ ...editStudentData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editStudentData.email}
                  onChange={(e) => setEditStudentData({ ...editStudentData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Room</label>
                <select
                  value={editStudentData.roomId || ''}
                  onChange={(e) =>
                    setEditStudentData({
                      ...editStudentData,
                      roomId: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {roomsList.map((r) => (
                    <option key={r.room_id} value={r.room_id}>
                      Room {r.room_number} ({r.available_beds} beds free)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={editStudentData.newPassword}
                  onChange={(e) => setEditStudentData({ ...editStudentData, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: EXCEL IMPORT & PREVIEW                                       */}
      {/* =================================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900">Excel Student Roster Import</h3>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportPreview(null);
                  setImportFile(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-4 space-y-4">
              {!importPreview ? (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Need the official template?</p>
                      <p className="text-xs text-slate-500">Download the formatted Excel template with instructions.</p>
                    </div>
                    <button
                      onClick={handleDownloadTemplate}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-500" />
                      Download Template
                    </button>
                  </div>

                  <form onSubmit={handlePreviewUpload} className="space-y-4">
                    <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-indigo-400 transition-colors">
                      <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-700">Choose an Excel spreadsheet (.xlsx, .xls)</p>
                      <p className="text-xs text-slate-400 mt-1">Maximum file size: 5MB</p>
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
                        className="mt-4 text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsImportModalOpen(false)}
                        className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!importFile || isImportPreviewing}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                      >
                        {isImportPreviewing && <Loader2 className="h-4 w-4 animate-spin" />}
                        Upload & Validate Preview
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Pills */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <p className="text-xs text-slate-500">Total Rows</p>
                      <p className="text-lg font-bold text-slate-800">{importPreview.summary.total}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                      <p className="text-xs text-emerald-600">Valid Records</p>
                      <p className="text-lg font-bold text-emerald-700">{importPreview.summary.validCount}</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-center">
                      <p className="text-xs text-red-600">Invalid Records</p>
                      <p className="text-lg font-bold text-red-700">{importPreview.summary.invalidCount}</p>
                    </div>
                  </div>

                  {/* Invalid Rows Section */}
                  {importPreview.invalidRows.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider">
                        Issues Detected ({importPreview.invalidRows.length} rows will be skipped):
                      </h4>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-red-50/50 rounded-xl border border-red-200">
                        {importPreview.invalidRows.map((inv, idx) => (
                          <div key={idx} className="text-xs text-red-900 bg-white p-2 rounded-lg border border-red-100">
                            <span className="font-semibold">Row {inv.rowNumber}:</span> {inv.errors.join('; ')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Valid Rows Preview */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Ready to Import ({importPreview.validRows.length} students):
                    </h4>
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                          <tr>
                            <th className="p-2">Roll</th>
                            <th className="p-2">Name</th>
                            <th className="p-2">Email</th>
                            <th className="p-2">Room</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {importPreview.validRows.map((v, i) => (
                            <tr key={i}>
                              <td className="p-2 font-semibold text-slate-800">{v.rollNumber}</td>
                              <td className="p-2">{v.fullName}</td>
                              <td className="p-2 text-slate-500">{v.email}</td>
                              <td className="p-2">{v.roomNumber || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Confirm or Cancel */}
                  <div className="pt-2 flex justify-between items-center border-t border-slate-100">
                    <button
                      onClick={() => setImportPreview(null)}
                      className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                    >
                      ← Upload Different File
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsImportModalOpen(false);
                          setImportPreview(null);
                        }}
                        className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmImport}
                        disabled={importPreview.summary.validCount === 0 || isImportConfirming}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        {isImportConfirming && <Loader2 className="h-4 w-4 animate-spin" />}
                        Confirm & Commit Import ({importPreview.summary.validCount})
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADD ROOM                                                     */}
      {/* =================================================================== */}
      {isAddRoomOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Add Hostel Room</h3>
              <button onClick={() => setIsAddRoomOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Room Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 101 or A-12"
                  value={newRoomData.roomNumber}
                  onChange={(e) => setNewRoomData({ ...newRoomData, roomNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Floor Number *</label>
                <input
                  type="number"
                  required
                  value={newRoomData.floorNumber}
                  onChange={(e) => setNewRoomData({ ...newRoomData, floorNumber: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Max Capacity (Beds) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newRoomData.capacity}
                  onChange={(e) => setNewRoomData({ ...newRoomData, capacity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRoomOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 cursor-pointer"
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: EDIT ROOM                                                    */}
      {/* =================================================================== */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Edit Room {editingRoom.room_number}</h3>
              <button onClick={() => setEditingRoom(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRoom} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Room Number</label>
                <input
                  type="text"
                  value={editRoomData.roomNumber}
                  onChange={(e) => setEditRoomData({ ...editRoomData, roomNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Floor Number</label>
                <input
                  type="number"
                  value={editRoomData.floorNumber}
                  onChange={(e) => setEditRoomData({ ...editRoomData, floorNumber: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max Capacity (Current Occupancy: {editingRoom.current_occupancy})
                </label>
                <input
                  type="number"
                  min={editingRoom.current_occupancy || 1}
                  value={editRoomData.capacity}
                  onChange={(e) => setEditRoomData({ ...editRoomData, capacity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: STUDENT ATTENDANCE HISTORY & DEVICE RESET (Phase 3 Preserved) */}
      {/* =================================================================== */}
      {selectedStudentHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900">{selectedStudentHistory.student.fullName}</h3>
                <p className="text-xs text-slate-500">
                  {selectedStudentHistory.student.rollNumber} • Room {selectedStudentHistory.student.roomNumber || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentHistory(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-4 space-y-4">
              {/* Device Status & Reset Banner */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-indigo-600" />
                    Device Binding Status
                  </span>
                  {selectedStudentHistory.student.isDeviceBound ? (
                    <span className="text-xs bg-indigo-100 text-indigo-700 font-medium px-2 py-0.5 rounded-full">
                      Bound Device
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-200 text-slate-600 font-medium px-2 py-0.5 rounded-full">
                      Unbound
                    </span>
                  )}
                </div>

                {selectedStudentHistory.student.isDeviceBound ? (
                  <div className="space-y-3 mt-3">
                    <p className="text-xs text-slate-500">
                      Bound on: {selectedStudentHistory.student.boundAt ? new Date(selectedStudentHistory.student.boundAt).toLocaleDateString() : 'N/A'}
                    </p>
                    <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
                      <label className="text-xs font-medium text-slate-700">Warden Reset Reason:</label>
                      <input
                        type="text"
                        value={resetReason}
                        onChange={(e) => setResetReason(e.target.value)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                      <button
                        onClick={() => handleResetDevice(selectedStudentHistory.student.studentId)}
                        disabled={isResettingDevice}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isResettingDevice && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Reset Device Binding
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">Student has not bound a mobile handset yet.</p>
                )}
              </div>

              {/* Attendance Log */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Recent Attendance Sessions</h4>
                {selectedStudentHistory.history.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No attendance records on file.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                    {selectedStudentHistory.history.map((record) => (
                      <div key={record.attendance_id} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">{record.attendance_date}</p>
                          <p className="text-slate-400">{record.marked_time} IST • {Number(record.distance_meters).toFixed(1)}m from hostel</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full font-medium ${
                            record.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {record.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
