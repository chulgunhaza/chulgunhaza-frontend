import { apiClient } from './client';
import type { DashboardStatsResponseDto } from '../types/dashboard';

// GET /v1/dashboard/stats — MANAGER 권한 필요.
export async function getDashboardStats(): Promise<DashboardStatsResponseDto> {
  const res = await apiClient.get<DashboardStatsResponseDto>('/v1/dashboard/stats');
  return res.data;
}
