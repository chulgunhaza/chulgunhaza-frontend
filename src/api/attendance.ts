import { apiClient } from './client';
import type { AttendanceCreateRequestDto } from '../types/attendance';

// 백엔드에 "내 출근 기록 조회" API가 없어서(등록용 POST만 존재) 체크인 액션만 제공한다.
// AttendanceController.registerAttendance는 RabbitMQ에 적재만 하고 즉시 200을 주므로,
// 실제 저장 성공 여부는 이 응답만으로는 알 수 없다 (비동기 처리).
export async function registerAttendance(employeeNo: number, checkInTime: Date): Promise<void> {
  const body: AttendanceCreateRequestDto = {
    employeeNo,
    checkInTime: formatDateTime(checkInTime),
  };
  await apiClient.post('/v1/attendance/register', body);
}

function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
