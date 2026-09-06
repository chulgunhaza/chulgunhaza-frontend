import { apiClient } from './client';
import type {
  EmployeeResponseDto,
  EmployeeListResponseDto,
  EmployeeCreateRequestDto,
  EmployeeModifyRequestDto,
} from '../types/employee';
import type { PageDto } from '../types/common';

export async function getEmployee(id: number): Promise<EmployeeResponseDto> {
  const res = await apiClient.get<EmployeeResponseDto>(`/v1/employee/list/${id}`);
  return res.data;
}

export async function getEmployeeList(page = 0, size = 10): Promise<PageDto<EmployeeListResponseDto>> {
  const res = await apiClient.get<PageDto<EmployeeListResponseDto>>('/v1/employee/list', {
    params: { page, size },
  });
  return res.data;
}

// EmployeeController.create — MANAGER 권한 필요, 일반 @RequestBody(JSON)
export async function createEmployee(dto: EmployeeCreateRequestDto): Promise<void> {
  await apiClient.post('/v1/employee/create', dto);
}

// EmployeeController.modifyEmployee — MANAGER 권한 필요, @RequestPart(JSON) + 선택적
// @RequestParam("employeeImage") 파일이라 multipart로 보내야 한다. 사진 변경은 관리자
// 페이지 스코프 밖이라 파일 파트는 안 보낸다(백엔드가 required=false로 이미 허용).
export async function modifyEmployee(id: number, dto: EmployeeModifyRequestDto): Promise<void> {
  const form = new FormData();
  form.append('employeeModifyRequestDto', new Blob([JSON.stringify(dto)], { type: 'application/json' }));

  await apiClient.put(`/v1/employee/modify/${id}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// EmployeeController.deleteEmployee — MANAGER 권한 필요, 소프트 딜리트
export async function deleteEmployee(id: number): Promise<void> {
  await apiClient.patch(`/v1/employee/delete/${id}`);
}
