import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <h1>출근하자 🕘</h1>
          {user && (
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4 }}>
              {user.depart} · {user.name}
            </div>
          )}
        </div>
        <nav>
          <NavLink to="/" end>
            대시보드
          </NavLink>
          <NavLink to="/board">게시판</NavLink>
          <NavLink to="/chat">채팅</NavLink>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <NotificationBell />
          {user && (
            <button className="btn" style={{ width: '100%', marginTop: 12 }} onClick={() => logout()}>
              로그아웃
            </button>
          )}
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
