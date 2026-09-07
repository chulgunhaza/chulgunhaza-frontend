// AttendanceCreateRequestDto — 백엔드가 employeeNo(사번) 기준으로 받는다 (id/PK 아님)
export interface AttendanceCreateRequestDto {
  employeeNo: number;
  checkInTime: string; // yyyy-MM-dd HH:mm:ss
}

// domain/attendance/AttendanceType.java 그대로 매핑
export type AttendanceType = 'NORMAL' | 'LATE' | 'ABSENT' | 'ANNUAL';

export const ATTENDANCE_TYPE_LABEL: Record<AttendanceType, string> = {
  NORMAL: '출근',
  LATE: '지각',
  ABSENT: '결근',
  ANNUAL: '연차',
};

// AttendanceListResponseDto — 관리자 페이지 근태 관리 화면에서 쓴다
export interface AttendanceListResponseDto {
  employeeNo: number;
  employeeName: string;
  checkInTime: string;
  attendanceType: AttendanceType;
}
