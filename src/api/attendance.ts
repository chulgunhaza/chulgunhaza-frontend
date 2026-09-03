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

// AttendanceCreateRequestDto.checkInTime의 @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")은
// Spring MVC의 폼/쿼리파라미터 바인딩에만 적용되고 @RequestBody(JSON) 역직렬화엔 영향을
// 안 준다 — 실제로는 Jackson의 기본 LocalDateTime 파서가 그 자리를 대신하는데, 이건 ISO-8601
// ("T" 구분자)만 받는다. 공백으로 보내면 500(DateTimeParseException)이 난다 — 실측으로
// 발견(대시보드 "지금 출근 등록" 클릭 시 재현). 백엔드 DTO는 그대로 두고 프론트에서
// Jackson이 실제로 받는 형식에 맞춰 보낸다.
function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
