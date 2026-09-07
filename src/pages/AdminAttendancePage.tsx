import { useEffect, useState, type FormEvent } from 'react';
import { getAttendanceList } from '../api/attendance';
import { toApiError } from '../api/client';
import { ATTENDANCE_TYPE_LABEL } from '../types/attendance';
import type { AttendanceListResponseDto } from '../types/attendance';
import type { PageDto } from '../types/common';

// 근태 관리 — 관리자 백로그 Epic 3. 등록(register) API만 있고 조회 API가 아예 없던 걸
// 백엔드에 GET /v1/attendance를 새로 만들어서 메웠다. 사번으로 필터링해서 특정 사원의
// 출근 이력만 볼 수도 있다.
export function AdminAttendancePage() {
  const [employeeNoInput, setEmployeeNoInput] = useState('');
  const [employeeNo, setEmployeeNo] = useState<number | undefined>(undefined);
  const [page, setPage] = useState<PageDto<AttendanceListResponseDto> | null>(null);
  const [pageNum, setPageNum] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getAttendanceList(employeeNo, pageNum, 20);
      setPage(res);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeNo, pageNum]);

  function handleFilterSubmit(e: FormEvent) {
    e.preventDefault();
    setPageNum(0);
    const trimmed = employeeNoInput.trim();
    setEmployeeNo(trimmed ? Number(trimmed) : undefined);
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h3 style={{ margin: 0 }}>근태 관리</h3>
          <p style={{ fontSize: 13, color: 'var(--ink-fade)', margin: '4px 0 0' }}>
            전사 출근 기록을 최신순으로 보여줍니다. 사번으로 특정 사원만 필터링할 수 있습니다.
          </p>
        </div>
        <form onSubmit={handleFilterSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div className="field" style={{ marginBottom: 0, width: 160 }}>
            <label>사번 (선택)</label>
            <input
              value={employeeNoInput}
              onChange={(e) => setEmployeeNoInput(e.target.value)}
              placeholder="예: 10000093"
              inputMode="numeric"
            />
          </div>
          <button type="submit" className="btn">
            조회
          </button>
        </form>
      </div>

      {loading && <p style={{ color: 'var(--ink-fade)' }}>불러오는 중...</p>}
      {error && <p className="error-text">{error}</p>}

      {page && (
        <div className="card" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>사번</th>
                <th>이름</th>
                <th>출근 시간</th>
                <th>구분</th>
              </tr>
            </thead>
            <tbody>
              {page.contents.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ color: 'var(--ink-fade)' }}>
                    출근 기록이 없습니다.
                  </td>
                </tr>
              ) : (
                page.contents.map((record, i) => (
                  <tr key={`${record.employeeNo}-${record.checkInTime}-${i}`}>
                    <td>{record.employeeNo}</td>
                    <td>{record.employeeName}</td>
                    <td>{new Date(record.checkInTime).toLocaleString('ko-KR')}</td>
                    <td>
                      <span className={record.attendanceType === 'LATE' ? 'error-text' : undefined}>
                        {ATTENDANCE_TYPE_LABEL[record.attendanceType]}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
            <button className="btn" disabled={page.isFirstPage} onClick={() => setPageNum((p) => p - 1)}>
              이전
            </button>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              {page.currentPage + 1} / {Math.max(page.totalPages, 1)}
            </span>
            <button className="btn" disabled={page.isLastPage} onClick={() => setPageNum((p) => p + 1)}>
              다음
            </button>
          </div>
        </div>
      )}
    </>
  );
}
