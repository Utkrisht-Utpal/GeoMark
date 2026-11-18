export type UserRole = 'STUDENT' | 'WARDEN';

export interface User {
  userId: number;
  role: UserRole;
  hostelId: number;
  hostelName?: string;
  rollNumber?: string;
  username?: string;
  email: string;
  fullName: string;
  roomNumber?: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
}

export interface DeviceStatusData {
  studentId: number;
  rollNumber: string;
  isBound: boolean;
  isCurrentDevice?: boolean;
  boundAt?: string;
  lastUsedAt?: string;
}

export interface AttendanceWindowInfo {
  isOpen: boolean;
  startTime: string;
  endTime: string;
  formattedStartTime?: string;
  formattedEndTime?: string;
  timezone: string;
  serverTime: string;
  serverTimeIst: string;
  serverDateIst: string;
  reason?: string;
}

export interface TodayAttendanceStatus {
  isMarked: boolean;
  attendance: {
    attendance_id: number;
    attendance_date: string;
    marked_time: string;
    distance_meters: number;
    accuracy_meters: number;
    status: string;
    hostel_name: string;
  } | null;
  windowStatus: {
    isOpen: boolean;
    opensAt: string;
    closesAt: string;
    startTime?: string;
    endTime?: string;
    formattedStartTime?: string;
    formattedEndTime?: string;
    timezone?: string;
    serverTime?: string;
    serverTimeIst: string;
    serverDateIst: string;
    reason?: string;
  };
}

export interface StudentAttendanceRecord {
  attendance_id: number;
  attendance_date: string;
  marked_time: string;
  distance_meters: number;
  accuracy_meters: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  verification_method: string;
}

export interface WardenAttendanceStudent {
  student_id: number;
  roll_number: string;
  full_name: string;
  room_number: string | null;
  email: string;
  attendance_status: 'PRESENT' | 'ABSENT';
  marked_time: string | null;
  distance_meters: number | null;
  accuracy_meters: number | null;
}

export interface WardenHostelOverview {
  hostelId: number;
  hostelName: string;
  date: string;
  summary: {
    totalStudents: number;
    presentCount: number;
    absentCount: number;
    attendanceRate: number;
  };
  students: WardenAttendanceStudent[];
}

export interface StudentDetailHistory {
  student: {
    studentId: number;
    rollNumber: string;
    fullName: string;
    email: string;
    roomNumber: string | null;
    hostelName: string;
    status: string;
    isDeviceBound: boolean;
    boundAt: string | null;
    lastUsedAt: string | null;
  };
  totalRecords: number;
  history: StudentAttendanceRecord[];
}

// ==========================================
// Phase 4 Types: Students, Rooms, Reports
// ==========================================

export interface ManagedStudent {
  student_id: number;
  roll_number: string;
  full_name: string;
  email: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'ALUMNI';
  created_at: string;
  room_id: number | null;
  room_number: string | null;
  floor_number: number | null;
  is_device_bound: number;
  device_last_used_at: string | null;
}

export interface StudentListResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  students: ManagedStudent[];
}

export interface RoomItem {
  room_id: number;
  hostel_id: number;
  room_number: string;
  floor_number: number;
  capacity: number;
  is_active: number | boolean;
  current_occupancy: number;
  available_beds: number;
  created_at: string;
}

export interface ValidImportRow {
  rowNumber: number;
  rollNumber: string;
  fullName: string;
  email: string;
  roomNumber: string | null;
  roomId: number | null;
}

export interface InvalidImportRow {
  rowNumber: number;
  data: {
    rollNumber?: string;
    fullName?: string;
    email?: string;
    roomNumber?: string;
  };
  errors: string[];
}

export interface ImportPreviewResponse {
  previewId: string;
  summary: {
    total: number;
    validCount: number;
    invalidCount: number;
  };
  validRows: ValidImportRow[];
  invalidRows: InvalidImportRow[];
}

export interface DailyTrendItem {
  date: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  rate: number;
}

export interface RoomTurnoutItem {
  roomId: number;
  roomNumber: string;
  floorNumber: number;
  capacity: number;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  rate: number;
}

export interface StudentInsightItem {
  studentId: number;
  rollNumber: string;
  fullName: string;
  roomNumber: string | null;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  attendanceRate: number;
}

export interface StudentInsightsResponse {
  threshold: number;
  totalDaysEvaluated: number;
  lowAttendanceStudents: StudentInsightItem[];
}

export interface HostelGeofenceConfig {
  hostelId: number;
  hostelName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  updatedAt: string;
}
