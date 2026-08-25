import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { getEmployee } from '../api/employee';
import { registerAttendance } from '../api/attendance';
import { useAnnualLeave } from '../api/annual';
import { ANNUAL_TYPE_LABEL, type AnnualType } from '../types/annual';
import type { Annual } from '../types/employee';
import { toApiError } from '../api/client';

export function DashboardPage() {
  const { user } = useAuth();
  const [annual, setAnnual] = useState<Annual | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [checkInStatus, setCheckInStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [checkInError, setCheckInError] = useState<string | null>(null);

  const [annualDate, setAnnualDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [annualType, setAnnualType] = useState<AnnualType>('ANNUAL');
  const [annualReason, setAnnualReason] = useState('');
  const [annualStatus, setAnnualStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [annualError, setAnnualError] = useState<string | null>(null);

  async function loadAnnual() {
    if (!user) return;
    try {
      const emp = await getEmployee(user.id);
      setAnnual(emp.annual);
      setLoadError(null);
    } catch (err) {
      setLoadError(toApiError(err).message);
    }
  }

  useEffect(() => {
    loadAnnual();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleCheckIn() {
    if (!user) return;
    setCheckInStatus('sending');
    setCheckInError(null);
    try {
      await registerAttendance(user.employeeNo, new Date());
      setCheckInStatus('sent');
    } catch (err) {
      setCheckInStatus('error');
      setCheckInError(toApiError(err).message);
    }
  }

  async function handleAnnualSubmit(e: FormEvent) {
    e.preventDefault();
    setAnnualStatus('sending');
    setAnnualError(null);
    try {
      const res = await useAnnualLeave({ annualDate, annualType, annualReason });
      setAnnual((prev) => (prev ? { ...prev, remainingAnnualCount: res.remainingAnnualCount, useCount: res.useCount } : prev));
      setAnnualStatus('idle');
      setAnnualReason('');
    } catch (err) {
      setAnnualStatus('error');
      setAnnualError(toApiError(err).message);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ margin: 0 }}>대시보드</h2>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>출근 체크인</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          백엔드에 출근 기록 조회 API가 없어, 등록 결과만 확인할 수 있습니다. (RabbitMQ로 비동기 처리되어
          등록 즉시 응답이 오지만 실제 저장은 백그라운드에서 이뤄집니다.)
        </p>
        <button className="btn btn-primary" onClick={handleCheckIn} disabled={checkInStatus === 'sending'}>
          {checkInStatus === 'sending' ? '등록 중...' : '지금 출근 등록'}
        </button>
        {checkInStatus === 'sent' && <p style={{ color: 'var(--good)', fontSize: 13 }}>출근 등록 요청을 보냈습니다.</p>}
        {checkInStatus === 'error' && <p className="error-text">{checkInError}</p>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>연차 현황 및 사용</h3>
        {loadError && <p className="error-text">{loadError}</p>}
        {annual && (
          <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
            <Stat label="총 연차" value={`${annual.totalAnnualCount}일`} />
            <Stat label="사용" value={`${annual.useCount}일`} />
            <Stat label="잔여" value={`${annual.remainingAnnualCount}일`} highlight />
          </div>
        )}
        <form onSubmit={handleAnnualSubmit}>
          <div className="field">
            <label>날짜</label>
            <input type="date" value={annualDate} onChange={(e) => setAnnualDate(e.target.value)} required />
          </div>
          <div className="field">
            <label>종류</label>
            <select value={annualType} onChange={(e) => setAnnualType(e.target.value as AnnualType)}>
              {Object.entries(ANNUAL_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>사유 (선택)</label>
            <input type="text" value={annualReason} onChange={(e) => setAnnualReason(e.target.value)} />
          </div>
          {annualStatus === 'error' && <p className="error-text">{annualError}</p>}
          <button type="submit" className="btn btn-primary" disabled={annualStatus === 'sending'}>
            {annualStatus === 'sending' ? '신청 중...' : '연차 사용'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: highlight ? 'var(--accent)' : 'var(--ink)' }}>{value}</div>
    </div>
  );
}
