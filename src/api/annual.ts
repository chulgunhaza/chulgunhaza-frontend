import { apiClient } from './client';
import type { AnnualUsageRequestDto, AnnualUsageResponseDto } from '../types/annual';

export async function applyAnnualLeave(dto: AnnualUsageRequestDto): Promise<AnnualUsageResponseDto> {
  const res = await apiClient.post<AnnualUsageResponseDto>('/v1/annual/use', dto);
  return res.data;
}
