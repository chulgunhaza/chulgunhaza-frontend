import { apiClient } from './client';
import type { EmployeeResponseDto, EmployeeListResponseDto } from '../types/employee';
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
