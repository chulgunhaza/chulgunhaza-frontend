import { attendanceApiClient } from './client';
import type { AttendanceCreateRequestDto, AttendanceListResponseDto } from '../types/attendance';
import type { PageDto } from '../types/common';

// #100: attendance-server가 물리 분리되면서 :8081이 아니라 :8082로 요청을
// 보내야 한다 — attendanceApiClient(client.ts)가 그 baseURL을 갖고 있다.
// AttendanceController.registerAttendance는 RabbitMQ에 적재만 하고 즉시 200을 주므로,
// 실제 저장 성공 여부는 이 응답만으로는 알 수 없다 (비동기 처리).
export async function registerAttendance(employeeNo: number, checkInTime: Date): Promise<void> {
  const body: AttendanceCreateRequestDto = {
    employeeNo,
    checkInTime: formatDateTime(checkInTime),
  };
  await attendanceApiClient.post('/v1/attendance/register', body);
}

// GET /v1/attendance — MANAGER 권한 필요. employeeNo를 안 주면 전사 출근 기록.
export async function getAttendanceList(
  employeeNo?: number,
  page = 0,
  size = 20,
): Promise<PageDto<AttendanceListResponseDto>> {
  const res = await attendanceApiClient.get<PageDto<AttendanceListResponseDto>>('/v1/attendance', {
    params: { employeeNo, page, size },
  });
  return res.data;
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
