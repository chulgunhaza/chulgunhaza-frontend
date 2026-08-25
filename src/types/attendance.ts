// AttendanceCreateRequestDto — 백엔드가 employeeNo(사번) 기준으로 받는다 (id/PK 아님)
export interface AttendanceCreateRequestDto {
  employeeNo: number;
  checkInTime: string; // yyyy-MM-dd HH:mm:ss
}
