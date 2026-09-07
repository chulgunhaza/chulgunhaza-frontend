import { apiClient } from './client';
import type { AnnualUsageRequestDto, AnnualUsageResponseDto, AnnualRecordListResponseDto } from '../types/annual';
import type { PageDto } from '../types/common';

export async function applyAnnualLeave(dto: AnnualUsageRequestDto): Promise<AnnualUsageResponseDto> {
  const res = await apiClient.post<AnnualUsageResponseDto>('/v1/annual/use', dto);
  return res.data;
}

// GET /v1/annual/records — MANAGER 권한 필요. 관리자 연차 결재(반려) 화면용.
export async function getAnnualRecords(page = 0, size = 20): Promise<PageDto<AnnualRecordListResponseDto>> {
  const res = await apiClient.get<PageDto<AnnualRecordListResponseDto>>('/v1/annual/records', {
    params: { page, size },
  });
  return res.data;
}

// MANAGER 권한 필요. 반려하면 해당 사원의 잔여 연차가 환급된다.
export async function rejectAnnualRecord(annualRecordId: number): Promise<void> {
  await apiClient.patch(`/v1/annual/records/${annualRecordId}/reject`);
}
