import { useEffect, useState } from 'react';
import { getAnnualRecords, rejectAnnualRecord } from '../api/annual';
import { toApiError } from '../api/client';
import { ANNUAL_TYPE_LABEL, ANNUAL_APPROVAL_STATUS_LABEL } from '../types/annual';
import type { AnnualRecordListResponseDto } from '../types/annual';
import type { PageDto } from '../types/common';

// 연차 결재 — 관리자 백로그 Epic 4. 지금은 신청 즉시 자동 승인되는 구조라(별도
// 결재 라인이 없음, AnnualLeaveServiceImpl 참고) "사전 승인 대기" 개념은 아직 없다.
// 대신 관리자가 이미 사용 처리된 연차를 사후에 반려할 수 있게 해서 — 반려하면
// 그 사원의 잔여 연차가 환급된다. 이미 반려된 건은 다시 반려할 수 없다(백엔드가
// 멱등성 가드로 막음).
export function AdminAnnualPage() {
  const [page, setPage] = useState<PageDto<AnnualRecordListResponseDto> | null>(null);
  const [pageNum, setPageNum] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AnnualRecordListResponseDto | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnnualRecords(pageNum, 20);
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
  }, [pageNum]);

  async function handleRejectConfirm() {
    if (!rejectTarget) return;
    setRejecting(true);
    setRejectError(null);
    try {
      await rejectAnnualRecord(rejectTarget.annualRecordId);
      setRejectTarget(null);
      await load();
    } catch (err) {
      setRejectError(toApiError(err).message);
    } finally {
      setRejecting(false);
    }
  }

  return (
    <>
      <div>
        <h3 style={{ margin: 0 }}>연차 결재</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-fade)', margin: '4px 0 0' }}>
          연차 신청은 즉시 자동 승인됩니다. 부적절한 신청은 여기서 반려할 수 있고, 반려하면 해당 사원의 잔여 연차가 환급됩니다.
        </p>
      </div>

      {loading && <p style={{ color: 'var(--ink-fade)' }}>불러오는 중...</p>}
      {error && <p className="error-text">{error}</p>}

      {page && (
        <div className="card" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>날짜</th>
                <th>종류</th>
                <th>사유</th>
                <th>상태</th>
                <th style={{ width: 90 }} />
              </tr>
            </thead>
            <tbody>
              {page.contents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ color: 'var(--ink-fade)' }}>
                    연차 사용 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                page.contents.map((record) => (
                  <tr key={record.annualRecordId}>
                    <td>{record.employeeName}</td>
                    <td>{record.annualDate}</td>
                    <td>{ANNUAL_TYPE_LABEL[record.annualType]}</td>
                    <td>{record.annualReason || '-'}</td>
                    <td>
                      <span className={record.annualApprovalStatus === 'REJECTED' ? 'error-text' : undefined}>
                        {ANNUAL_APPROVAL_STATUS_LABEL[record.annualApprovalStatus]}
                      </span>
                    </td>
                    <td>
                      {record.annualApprovalStatus !== 'REJECTED' && (
                        <button
                          className="btn btn-danger"
                          style={{ padding: '4px 10px', fontSize: 12.5 }}
                          onClick={() => {
                            setRejectError(null);
                            setRejectTarget(record);
                          }}
                        >
                          반려
                        </button>
                      )}
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

      {rejectTarget && (
        <div className="modal-overlay" onClick={() => setRejectTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="modal-title">연차 반려</p>
            <p className="modal-body">
              '{rejectTarget.employeeName}'님의 {rejectTarget.annualDate} 연차를 반려할까요? 잔여 연차가 환급됩니다.
            </p>
            {rejectError && <p className="error-text">{rejectError}</p>}
            <div className="modal-actions">
              <button className="btn" onClick={() => setRejectTarget(null)}>
                취소
              </button>
              <button className="btn btn-danger" onClick={handleRejectConfirm} disabled={rejecting}>
                {rejecting ? '처리 중...' : '반려'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
