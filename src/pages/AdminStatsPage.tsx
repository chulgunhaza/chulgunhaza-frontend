import { useEffect, useState } from 'react';
import { getDashboardStats } from '../api/dashboard';
import { toApiError } from '../api/client';
import type { DashboardStatsResponseDto } from '../types/dashboard';
import { Stat } from '../components/Stat';

// 대시보드/통계 — 관리자 백로그 Epic 6. 사원/근태/게시판을 가로지르는 요약
// 카드만 가볍게 보여준다 (부서별 인원, 오늘 출근 인원, 전체 게시글 수).
export function AdminStatsPage() {
  const [stats, setStats] = useState<DashboardStatsResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((err) => setError(toApiError(err).message));
  }, []);

  if (error) return <p className="error-text">{error}</p>;
  if (!stats) return <p style={{ color: 'var(--ink-fade)' }}>불러오는 중...</p>;

  const departmentEntries = Object.entries(stats.departmentCounts);

  return (
    <>
      <h3 style={{ marginTop: 0 }}>대시보드 통계</h3>

      <div className="card">
        <div className="stat-tile-row">
          <Stat label="전체 인원" value={`${stats.totalEmployees}명`} />
          <Stat label="오늘 출근" value={`${stats.todayAttendanceCount}명`} highlight />
          <Stat label="전체 게시글" value={`${stats.totalPosts}건`} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>부서별 인원</h3>
        {departmentEntries.length === 0 ? (
          <p style={{ color: 'var(--ink-fade)' }}>부서 데이터가 없습니다.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>부서</th>
                <th>인원</th>
              </tr>
            </thead>
            <tbody>
              {departmentEntries.map(([department, count]) => (
                <tr key={department}>
                  <td>{department}</td>
                  <td>{count}명</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
