import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { HostelGeofenceConfig } from '../types';
import { api } from '../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Save,
  RotateCcw,
  Plus,
  Minus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  Layers,
  Crosshair,
  Compass,
} from 'lucide-react';

interface HostelGeofenceSettingsProps {
  token: string;
}

interface NominatimSearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export const HostelGeofenceSettings: React.FC<HostelGeofenceSettingsProps> = ({ token }) => {
  const [config, setConfig] = useState<HostelGeofenceConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<HostelGeofenceConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Form State
  const [lat, setLat] = useState<number>(30.7685);
  const [lng, setLng] = useState<number>(76.5752);
  const [radius, setRadius] = useState<number>(100);

  // Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Leaflet Map Refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Load initial geofence configuration from backend
  const loadGeofence = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await api.getHostelGeofence(token);
      setConfig(res.data);
      setOriginalConfig(res.data);
      setLat(res.data.latitude);
      setLng(res.data.longitude);
      setRadius(res.data.radiusMeters);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to fetch hostel geofence settings.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadGeofence();
  }, [loadGeofence]);

  // Custom SVG Hostel Pin Icon (immune to bundler image-path breakage)
  const getCustomPinIcon = () =>
    L.divIcon({
      className: 'custom-hostel-marker',
      html: `
        <div style="
          width: 36px;
          height: 36px;
          background: #4f46e5;
          border: 3px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 14px rgba(79, 70, 229, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
        ">
          <svg style="transform: rotate(45deg); width: 18px; height: 18px; color: white;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    });

  // Initialize Leaflet Map
  useEffect(() => {
    if (isLoading || !mapContainerRef.current || mapRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Create Geofence Circle
      const circle = L.circle([lat, lng], {
        radius,
        color: '#4f46e5',
        fillColor: '#6366f1',
        fillOpacity: 0.22,
        weight: 2,
        dashArray: '5, 5',
      }).addTo(map);
      circleRef.current = circle;

      // Create Draggable Hostel Centroid Marker
      const marker = L.marker([lat, lng], {
        draggable: true,
        icon: getCustomPinIcon(),
        title: config?.hostelName || 'Hostel Centroid',
      }).addTo(map);
      markerRef.current = marker;

      marker.bindPopup(`<strong>${config?.hostelName || 'Hostel Centroid'}</strong><br/>Drag to fine-tune centroid.`);

      // Marker drag event
      marker.on('drag', (e: L.LeafletEvent) => {
        const markerPos = (e.target as L.Marker).getLatLng();
        circle.setLatLng(markerPos);
        setLat(Number(markerPos.lat.toFixed(6)));
        setLng(Number(markerPos.lng.toFixed(6)));
      });

      // Map click event: reposition marker & circle
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        circle.setLatLng([clickLat, clickLng]);
        setLat(Number(clickLat.toFixed(6)));
        setLng(Number(clickLng.toFixed(6)));
      });

      mapRef.current = map;

      // Invalidate map size after mount for clean rendering
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    } catch (mapErr) {
      console.error('Failed to initialize Leaflet map:', mapErr);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isLoading]);

  // Update map visual elements when lat/lng change from external inputs
  const syncMapPosition = (newLat: number, newLng: number) => {
    if (markerRef.current && circleRef.current && mapRef.current) {
      const pos: L.LatLngExpression = [newLat, newLng];
      markerRef.current.setLatLng(pos);
      circleRef.current.setLatLng(pos);
      mapRef.current.panTo(pos, { animate: true });
    }
  };

  // Update geofence circle radius on map
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius);
    }
  }, [radius]);

  // Handle manual coordinate changes
  const handleLatChange = (valStr: string) => {
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      setLat(val);
      if (val >= -90 && val <= 90) {
        syncMapPosition(val, lng);
      }
    }
  };

  const handleLngChange = (valStr: string) => {
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      setLng(val);
      if (val >= -180 && val <= 180) {
        syncMapPosition(lat, val);
      }
    }
  };

  // Radius Step Controls
  const adjustRadius = (delta: number) => {
    setRadius((prev) => {
      const next = Math.max(20, Math.min(500, prev + delta));
      return next;
    });
  };

  // OpenStreetMap Nominatim Place Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery.trim()
      )}&limit=5`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
        },
      });

      if (!res.ok) throw new Error('Location lookup service unavailable.');
      const data: NominatimSearchResult[] = await res.json();

      if (data.length === 0) {
        setSearchError('No matching places found. Try a different landmark or city.');
      } else {
        setSearchResults(data);
      }
    } catch (err: any) {
      setSearchError('Geocoding search failed. You can still click anywhere on the map or enter coordinates directly.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (item: NominatimSearchResult) => {
    const newLat = parseFloat(Number(item.lat).toFixed(6));
    const newLng = parseFloat(Number(item.lon).toFixed(6));
    setLat(newLat);
    setLng(newLng);
    setSearchResults([]);
    setSearchQuery(item.display_name.split(',')[0]);
    syncMapPosition(newLat, newLng);
    if (mapRef.current) {
      mapRef.current.setView([newLat, newLng], 17, { animate: true });
    }
  };

  // Reset to original values
  const handleReset = () => {
    if (!originalConfig) return;
    setLat(originalConfig.latitude);
    setLng(originalConfig.longitude);
    setRadius(originalConfig.radiusMeters);
    syncMapPosition(originalConfig.latitude, originalConfig.longitude);
    setFeedback({ type: 'warning', message: 'Settings reset to last saved state.' });
  };

  // Trigger Save Confirmation
  const handleSaveClick = () => {
    // Basic client validations
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setFeedback({ type: 'error', message: 'Latitude must be between -90 and +90 degrees.' });
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setFeedback({ type: 'error', message: 'Longitude must be between -180 and +180 degrees.' });
      return;
    }
    if (isNaN(radius) || radius < 20 || radius > 500) {
      setFeedback({ type: 'error', message: 'Permitted radius must be between 20 and 500 meters.' });
      return;
    }

    setShowConfirmModal(true);
  };

  // Authoritative Save Execution
  const executeSave = async () => {
    setShowConfirmModal(false);
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await api.updateHostelGeofence(token, {
        latitude: lat,
        longitude: lng,
        radiusMeters: radius,
      });

      setConfig(res.data);
      setOriginalConfig(res.data);
      setFeedback({
        type: 'success',
        message: `${res.message} Real-time attendance verification will immediately use these coordinates.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to save geofence configuration.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Center on current hostel
  const handleCenterMap = () => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 16, { animate: true });
    }
  };

  const hasChanges =
    originalConfig &&
    (originalConfig.latitude !== lat || originalConfig.longitude !== lng || originalConfig.radiusMeters !== radius);

  const coverageArea = Math.round(Math.PI * radius * radius);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading hostel geofence configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Compass className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Hostel Geofence Settings</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
              {config?.hostelName || 'Hostel'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Define the authoritative centroid coordinates and circular attendance boundary for residents of{' '}
            <strong className="text-slate-700">{config?.hostelName}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="py-2 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Changes
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveClick}
            disabled={isSaving || !hasChanges}
            className="py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Geofence
          </button>
        </div>
      </div>

      {/* Feedback Messages */}
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
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs font-medium flex-1">{feedback.message}</div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold opacity-60 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Map & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive Map (Span 2) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-indigo-600" />
                Geofence Map Editor
              </h3>
              <p className="text-xs text-slate-500">
                Click map to place centroid, or drag the blue pin to fine-tune building boundary.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCenterMap}
              className="self-start sm:self-auto py-1 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
            >
              <Crosshair className="h-3.5 w-3.5 text-indigo-600" />
              Re-center
            </button>
          </div>

          {/* Place Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search landmark, university campus, or street..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Search'}
              </button>
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
                {searchResults.map((item) => (
                  <button
                    key={item.place_id}
                    type="button"
                    onClick={() => selectSearchResult(item)}
                    className="w-full text-left p-2.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 transition-colors flex items-start gap-2 cursor-pointer"
                  >
                    <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
                    <span className="truncate">{item.display_name}</span>
                  </button>
                ))}
              </div>
            )}

            {searchError && <p className="text-xs text-amber-700 mt-1.5">{searchError}</p>}
          </form>

          {/* Map Container */}
          <div className="relative rounded-xl overflow-hidden border border-slate-200 min-h-[460px] bg-slate-100">
            <div ref={mapContainerRef} className="w-full h-full min-h-[460px] z-10" />

            {/* Map Legend Overlay */}
            <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-xs p-2.5 rounded-lg border border-slate-200 shadow-md text-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" />
                <span className="text-[11px] font-semibold text-slate-700">Hostel Centroid</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-indigo-500 border-dashed bg-indigo-500/20 inline-block" />
                <span className="text-[11px] font-medium text-slate-600">Permitted Radius ({radius}m)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Coordinate & Radius Form (Span 1) */}
        <div className="space-y-6">
          {/* Coordinates Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-indigo-600" />
              Centroid Coordinates
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Latitude (-90.0 to +90.0)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={lat}
                  onChange={(e) => handleLatChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Longitude (-180.0 to +180.0)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={lng}
                  onChange={(e) => handleLngChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Coordinates format: WGS84 Decimal Degrees with 6 decimal places (~0.1m precision).
            </p>
          </div>

          {/* Radius Configuration Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-indigo-600" />
                Permitted Radius
              </h3>
              <span className="text-base font-extrabold text-indigo-600">{radius} meters</span>
            </div>

            {/* Radius Plus / Minus Stepper */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustRadius(-10)}
                disabled={radius <= 20}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 transition-colors cursor-pointer"
                title="Decrease 10m"
              >
                <Minus className="h-4 w-4" />
              </button>

              <input
                type="range"
                min="20"
                max="500"
                step="5"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                className="flex-1 accent-indigo-600 cursor-pointer"
              />

              <button
                type="button"
                onClick={() => adjustRadius(10)}
                disabled={radius >= 500}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 transition-colors cursor-pointer"
                title="Increase 10m"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Preset Buttons */}
            <div>
              <span className="block text-[11px] font-medium text-slate-400 mb-1.5">Quick Presets:</span>
              <div className="grid grid-cols-4 gap-1.5">
                {[50, 100, 150, 250].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRadius(preset)}
                    className={`py-1 px-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      radius === preset
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {preset}m
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Coverage Area: ~{coverageArea.toLocaleString()} m² ({Math.round(coverageArea / 4047)} acres).
            </p>
          </div>

          {/* Current Saved Configuration Preview */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Active Settings</span>

            <div className="text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Hostel Name:</span>
                <strong className="text-slate-800">{config?.hostelName}</strong>
              </div>
              <div className="flex justify-between">
                <span>Active Center:</span>
                <span className="font-mono text-slate-800">
                  {config?.latitude.toFixed(6)}, {config?.longitude.toFixed(6)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Active Radius:</span>
                <strong className="text-slate-800">{config?.radiusMeters} meters</strong>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last Updated:
                </span>
                <span>{config?.updatedAt ? new Date(config.updatedAt).toLocaleString() : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Confirm Geofence Update</h3>
                <p className="text-xs text-slate-500">Hostel: {config?.hostelName}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to update the geographical centroid and attendance radius for{' '}
              <strong>{config?.hostelName}</strong>. All subsequent student attendance submissions will immediately be
              validated against this new perimeter.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">New Coordinates:</span>
                <strong className="font-mono text-slate-800">
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">New Radius:</span>
                <strong className="text-indigo-600 font-bold">{radius} meters</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSave}
                className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Confirm & Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
