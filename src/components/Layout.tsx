import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChatUnreadCount } from '../hooks/useChatUnreadCount';
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
    (location.pathname.startsWith('/board') ? '게시판' : '출근하자');

  const initial = user?.name?.slice(0, 1) ?? '?';

  // 라우트가 바뀔 때마다(특히 채팅 페이지를 벗어날 때 = 방금 읽은 게 반영됐을
  // 시점) 다시 불러와서 네브의 채팅 뱃지를 최신 상태로 맞춘다.
  const { unreadCount: chatUnreadCount } = useChatUnreadCount(!!user, location.pathname);

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
        <div className="rail-mark" title="출근하자">출</div>
        <nav className="rail-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `rail-item${isActive ? ' active' : ''}`}
              style={{ position: 'relative' }}
            >
              <span>{item.label}</span>
              {item.to === '/chat' && chatUnreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 10,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 999,
                    background: 'var(--danger)',
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                  }}
                >
                  {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                </span>
              )}
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
