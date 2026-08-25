import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';

const NAV_ITEMS = [
  { to: '/', icon: '🏠', label: '대시보드', end: true },
  { to: '/board', icon: '📋', label: '게시판', end: false },
  { to: '/chat', icon: '💬', label: '채팅', end: false },
];

const PAGE_TITLE: Record<string, string> = {
  '/': '대시보드',
  '/board': '게시판',
  '/chat': '채팅',
};

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const title =
    PAGE_TITLE[location.pathname] ??
    (location.pathname.startsWith('/board') ? '게시판' : 'SKCT Study');

  const initial = user?.name?.slice(0, 1) ?? '?';

  return (
    <div className="app-shell">
      <aside className="icon-rail">
        <div className="rail-mark" title="SKCT Study">SK</div>
        <nav className="rail-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `rail-item${isActive ? ' active' : ''}`}
            >
              <span className="rail-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="rail-bottom">
          <NotificationBell />
          {user && (
            <button className="rail-avatar" title={`${user.name} · 로그아웃`} onClick={() => logout()}>
              {initial}
            </button>
          )}
        </div>
      </aside>

      <div className="shell-body">
        <header className="top-header">
          <h1>{title}</h1>
          {user && (
            <div className="user-chip">
              <b>{user.name}</b>
              <span>· {user.depart}</span>
            </div>
          )}
        </header>
        <main className="main-content">
          <div className="content-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
