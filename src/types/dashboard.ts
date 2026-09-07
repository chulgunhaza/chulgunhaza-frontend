// DashboardStatsResponseDto — 관리자 백로그 Epic 6
export interface DashboardStatsResponseDto {
  totalEmployees: number;
  departmentCounts: Record<string, number>;
  todayAttendanceCount: number;
  totalPosts: number;
}
