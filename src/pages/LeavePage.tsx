import { useEffect, useState, type FormEvent } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { useAuth } from '../context/AuthContext';
import { getEmployee } from '../api/employee';
import { applyAnnualLeave } from '../api/annual';
import { ANNUAL_TYPE_LABEL, type AnnualType } from '../types/annual';
import type { Annual } from '../types/employee';
import { toApiError } from '../api/client';
import { Stat } from '../components/Stat';

// yyyy-MM-dd 문자열 <-> Date. annualDate는 서버에 문자열로 보내지만(AnnualUsageRequestDto),
// 달력(react-day-picker)은 Date 객체로 선택값을 다룬다. new Date('yyyy-MM-dd')는 UTC
// 자정으로 해석돼 로컬 타임존에 따라 하루가 밀릴 수 있어, 로컬 자정으로 직접 만든다.
function toDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function toDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function LeavePage() {
  const { user } = useAuth();
  const [annual, setAnnual] = useState<Annual | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [annualDate, setAnnualDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [annualType, setAnnualType] = useState<AnnualType>('ANNUAL');
  const [annualReason, setAnnualReason] = useState('');
  const [annualStatus, setAnnualStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [annualError, setAnnualError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getEmployee(user.id)
      .then((emp) => {
        setAnnual(emp.annual);
        setLoadError(null);
      })
      .catch((err) => setLoadError(toApiError(err).message));
  }, [user]);

  async function handleAnnualSubmit(e: FormEvent) {
    e.preventDefault();
    setAnnualStatus('sending');
    setAnnualError(null);
    try {
      const res = await applyAnnualLeave({ annualDate, annualType, annualReason });
      setAnnual((prev) => (prev ? { ...prev, remainingAnnualCount: res.remainingAnnualCount, useCount: res.useCount } : prev));
      setAnnualStatus('idle');
      setAnnualReason('');
    } catch (err) {
      setAnnualStatus('error');
      setAnnualError(toApiError(err).message);
    }
  }

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>연차 현황</h3>
        {loadError && <p className="error-text">{loadError}</p>}
        {annual && (
          <div className="stat-tile-row">
            <Stat label="총 연차" value={`${annual.totalAnnualCount}일`} />
            <Stat label="사용" value={`${annual.useCount}일`} />
            <Stat label="잔여" value={`${annual.remainingAnnualCount}일`} highlight />
          </div>
        )}
      </div>

      <div className="card" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div className="leave-calendar">
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>날짜 선택</h3>
          <DayPicker
            mode="single"
            selected={toDate(annualDate)}
            onSelect={(date) => date && setAnnualDate(toDateString(date))}
            defaultMonth={toDate(annualDate)}
          />
        </div>

        <form onSubmit={handleAnnualSubmit} style={{ flex: 1, minWidth: 220 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>연차 신청</h3>
          <div className="field">
            <label>선택한 날짜</label>
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
    </>
  );
}
