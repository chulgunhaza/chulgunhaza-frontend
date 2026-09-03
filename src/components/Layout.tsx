import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';

const NAV_ITEMS = [
  { to: '/', label: '대시보드', end: true },
  { to: '/board', label: '게시판', end: false },
  { to: '/chat', label: '채팅', end: false },
];

const PAGE_TITLE: Record<string, string> = {
  '/': '대시보드',
  '/board': '게시판',
  '/chat': '채팅',
};

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const title =
    PAGE_TITLE[location.pathname] ??
    (location.pathname.startsWith('/board') ? '게시판' : 'SKCT Study');

  const initial = user?.name?.slice(0, 1) ?? '?';

  // 계정 메뉴 바깥을 클릭하면 닫는다 — 로그아웃처럼 되돌리기 번거로운 액션이
  // 걸려 있는 메뉴라 열어둔 채 잊어버리지 않게, 클릭 한 번이면 바로 닫히게 했다.
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

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
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="rail-bottom">
          <NotificationBell />
          {user && (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                className="rail-avatar"
                title={`${user.name} · 계정 메뉴`}
                onClick={() => setMenuOpen((v) => !v)}
              >
                {initial}
              </button>
              {menuOpen && (
                <div
                  className="card popover-panel"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '100%',
                    marginLeft: 10,
                    width: 200,
                    zIndex: 20,
                    ['--popover-origin' as string]: 'bottom left',
                  }}
                >
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 700, margin: 0 }}>{user.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '2px 0 0' }}>{user.depart}</p>
                  </div>
                  <button
                    className="btn btn-danger"
                    style={{ width: '100%' }}
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
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
