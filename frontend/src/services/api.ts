import type {
  User,
  DeviceStatusData,
  AttendanceWindowInfo,
  TodayAttendanceStatus,
  StudentAttendanceRecord,
  WardenHostelOverview,
  StudentDetailHistory,
  StudentListResponse,
  ManagedStudent,
  RoomItem,
  ImportPreviewResponse,
  DailyTrendItem,
  RoomTurnoutItem,
  StudentInsightsResponse,
  HostelGeofenceConfig,
} from '../types';

const BASE_URL = '/api';

function getAuthHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }

  if (!res.ok) {
    const errorMsg = body?.error || body?.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return body;
}

export const api = {
  // Authentication
  async login(identifier: string, password: string, role?: 'STUDENT' | 'WARDEN') {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password, role }),
    });
    return handleResponse<{
      success: boolean;
      data: { token: string; user: User; expiresIn: string };
    }>(res);
  },

  async logout(token: string) {
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(token),
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async getMe(token: string) {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: getAuthHeaders(token),
    });
    return handleResponse<{ success: boolean; data: User }>(res);
  },

  // Student Device Endpoints
  async getDeviceStatus(token: string, deviceUuid?: string) {
    const url = deviceUuid
      ? `${BASE_URL}/student/device/status?deviceUuid=${encodeURIComponent(deviceUuid)}`
      : `${BASE_URL}/student/device/status`;
    const headers = getAuthHeaders(token);
    if (deviceUuid) {
      headers['X-Device-UUID'] = deviceUuid;
    }
    const res = await fetch(url, { headers });
    return handleResponse<{
      success: boolean;
      data: DeviceStatusData;
    }>(res);
  },

  async bindDevice(token: string, deviceUuid: string) {
    const res = await fetch(`${BASE_URL}/student/device/bind`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ deviceUuid }),
    });
    return handleResponse<{ success: boolean; message: string; data: any }>(res);
  },

  async verifyDevice(token: string, deviceUuid: string) {
    const res = await fetch(`${BASE_URL}/student/device/verify`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ deviceUuid }),
    });
    return handleResponse<{ success: boolean; verified: boolean; message?: string; error?: string }>(res);
  },

  // Student Attendance Endpoints
  async getAttendanceWindow(token: string) {
    const res = await fetch(`${BASE_URL}/student/attendance/window`, {
      headers: getAuthHeaders(token),
    });
    return handleResponse<{ success: boolean; data: AttendanceWindowInfo }>(res);
  },

  async getTodayAttendance(token: string) {
    const res = await fetch(`${BASE_URL}/student/attendance/today`, {
      headers: getAuthHeaders(token),
    });
    return handleResponse<{ success: boolean; data: TodayAttendanceStatus }>(res);
  },

  async markAttendance(
    token: string,
    payload: {
      deviceUuid: string;
      latitude: number;
      longitude: number;
      accuracy: number;
    }
  ) {
    const res = await fetch(`${BASE_URL}/student/attendance/mark`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    });
    return handleResponse<{ success: boolean; message: string; data: any }>(res);
  },

  async getStudentHistory(token: string, page = 1, limit = 15) {
    const res = await fetch(`${BASE_URL}/student/attendance/history?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders(token),
    });
    return handleResponse<{
      success: boolean;
      data: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        records: StudentAttendanceRecord[];
      };
    }>(res);
  },

  // Development / Testing Utility: Clear All Attendance
  async clearAllAttendance(token: string, isWarden = false) {
    const endpoint = isWarden ? `${BASE_URL}/warden/attendance/clear-all` : `${BASE_URL}/student/attendance/clear-all`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders(token),
    });
    return handleResponse<{ success: boolean; message: string; data: { deletedCount: number } }>(res);
  },

  // Warden Attendance Overview & History
  async getWardenOverview(token: string, date?: string) {
    const url = date ? `${BASE_URL}/warden/attendance?date=${date}` : `${BASE_URL}/warden/attendance`;
    const res = await fetch(url, {
      headers: getAuthHeaders(token),
    });
    return handleResponse<{ success: boolean; data: WardenHostelOverview }>(res);
  },

  async getWardenStudentHistory(token: string, studentId: number) {
    const res = await fetch(`${BASE_URL}/warden/attendance/${studentId}`, {
      headers: getAuthHeaders(token),
    });
    return handleResponse<{ success: boolean; data: StudentDetailHistory }>(res);
  },

  async resetStudentDevice(token: string, studentId: number, reason: string) {
    const res = await fetch(`${BASE_URL}/warden/students/reset-device`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ studentId, reason }),
    });
    return handleResponse<{ success: boolean; message: string; data: any }>(res);
  },

  // ==========================================
  // Phase 4: Student Roster Management
  // ==========================================
  async getStudents(
    token: string,
    params: { page?: number; limit?: number; search?: string; status?: string; roomId?: number } = {}
  ) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.roomId) query.append('roomId', String(params.roomId));

    const res = await fetch(`${BASE_URL}/warden/students?${query.toString()}`, {
      headers: getAuthHeaders(token),
    });
    return handleResponse<{ status: string; data: StudentListResponse }>(res);
  },

  async getStudentById(token: string, studentId: number) {
    const res = await fetch(`${BASE_URL}/warden/students/${studentId}`, {
      headers: getAuthHeaders(token),
    });
    return handleResponse<{ status: string; data: ManagedStudent }>(res);
  },

  async createStudent(
    token: string,
    data: { rollNumber: string; fullName: string; email: string; roomId?: number | null; password?: string }
  ) {
    const res = await fetch(`${BASE_URL}/warden/students`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse<{ status: string; message: string; data: { student: ManagedStudent; initialPassword: string } }>(res);
  },

  async updateStudent(
    token: string,
    studentId: number,
    data: { fullName?: string; email?: string; roomId?: number | null; newPassword?: string }
  ) {
    const res = await fetch(`${BASE_URL}/warden/students/${studentId}`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse<{ status: string; message: string; data: ManagedStudent }>(res);
  },

  async updateStudentStatus(token: string, studentId: number, status: 'ACTIVE' | 'SUSPENDED' | 'ALUMNI') {
    const res = await fetch(`${BASE_URL}/warden/students/${studentId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ status }),
    });
    return handleResponse<{ status: string; message: string; data: { studentId: number; status: string } }>(res);
  },

  // ==========================================
  // Phase 4: Room Management
  // ==========================================
  async getRooms(token: string) {
    const res = await fetch(`${BASE_URL}/warden/rooms`, {
      headers: getAuthHeaders(token),
    });
    return handleResponse<{ status: string; data: RoomItem[] }>(res);
  },

  async createRoom(token: string, data: { roomNumber: string; floorNumber: number; capacity: number }) {
    const res = await fetch(`${BASE_URL}/warden/rooms`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse<{ status: string; message: string; data: RoomItem }>(res);
  },

  async updateRoom(
    token: string,
    roomId: number,
    data: { roomNumber?: string; floorNumber?: number; capacity?: number }
  ) {
    const res = await fetch(`${BASE_URL}/warden/rooms/${roomId}`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse<{ status: string; message: string; data: RoomItem }>(res);
  },

  async updateRoomStatus(token: string, roomId: number, isActive: boolean) {
    const res = await fetch(`${BASE_URL}/warden/rooms/${roomId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ isActive }),
    });
    return handleResponse<{ status: string; message: string; data: { roomId: number; isActive: boolean; roomNumber: string } }>(res);
  },

  // ==========================================
  // Phase 4: Excel Import / Export
  // ==========================================
  async downloadImportTemplate(token: string): Promise<Blob> {
    const res = await fetch(`${BASE_URL}/warden/students/import-template`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Failed to download import template.');
    return res.blob();
  },

  async previewImport(token: string, file: File): Promise<{ status: string; data: ImportPreviewResponse }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/warden/students/import/preview`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return handleResponse<{ status: string; data: ImportPreviewResponse }>(res);
  },

  async confirmImport(token: string, previewId: string) {
    const res = await fetch(`${BASE_URL}/warden/students/import/confirm`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ previewId }),
    });
    return handleResponse<{ status: string; data: { importedCount: number; message: string } }>(res);
  },

  async exportStudents(token: string, filters: { search?: string; status?: string; roomId?: number } = {}): Promise<Blob> {
    const query = new URLSearchParams();
    if (filters.search) query.append('search', filters.search);
    if (filters.status) query.append('status', filters.status);
    if (filters.roomId) query.append('roomId', String(filters.roomId));

    const res = await fetch(`${BASE_URL}/warden/students/export?${query.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Failed to export students roster.');
    return res.blob();
  },

  async exportDailyAttendance(token: string, date?: string): Promise<Blob> {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    const res = await fetch(`${BASE_URL}/warden/attendance/export${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Failed to export daily attendance.');
    return res.blob();
  },

  async exportDateRangeAttendance(token: string, startDate: string, endDate: string): Promise<Blob> {
    const query = `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
    const res = await fetch(`${BASE_URL}/warden/attendance/export-range${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Failed to export date range attendance report.');
    return res.blob();
  },

  // ==========================================
  // Phase 4: Reporting & Insights
  // ==========================================
  async getTrends(token: string, days = 7) {
    const res = await fetch(`${BASE_URL}/warden/reports/trends?days=${days}`, {
      headers: getAuthHeaders(token),
    });
    return handleResponse<{ status: string; data: DailyTrendItem[] }>(res);
  },

  async getRoomAttendance(token: string, date?: string) {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    const res = await fetch(`${BASE_URL}/warden/reports/rooms${query}`, {
      headers: getAuthHeaders(token),
    });
    return handleResponse<{ status: string; data: RoomTurnoutItem[] }>(res);
  },

  async getStudentInsights(token: string, days = 30, threshold = 75) {
    const res = await fetch(`${BASE_URL}/warden/reports/insights?days=${days}&threshold=${threshold}`, {
      headers: getAuthHeaders(token),
    });
    return handleResponse<{ status: string; data: StudentInsightsResponse }>(res);
  },

  // ==========================================
  // Hostel Geofence Settings
  // ==========================================
  async getHostelGeofence(token: string) {
    const res = await fetch(`${BASE_URL}/warden/hostel/geofence`, {
      headers: getAuthHeaders(token),
    });
    return handleResponse<{ success: boolean; data: HostelGeofenceConfig }>(res);
  },

  async updateHostelGeofence(
    token: string,
    data: { latitude: number; longitude: number; radiusMeters: number }
  ) {
    const res = await fetch(`${BASE_URL}/warden/hostel/geofence`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; message: string; data: HostelGeofenceConfig }>(res);
  },
};
