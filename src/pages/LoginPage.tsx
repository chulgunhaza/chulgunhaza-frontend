import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toApiError } from '../api/client';
import { CraneMark } from '../components/icons';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <form onSubmit={handleSubmit} className="login-card">
        <div className="login-doc-no">사내 그룹웨어</div>
        <div className="login-mark"><CraneMark size={40} /></div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 0, marginBottom: 4 }}>출근하자</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-fade)', marginTop: 0, marginBottom: 24 }}>
          이메일로 로그인하세요
        </p>
        <div className="field">
          <label>이메일</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label>비밀번호</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '11px 16px' }} disabled={loading}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  );
}
