import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { NotificationBell } from './NotificationBell';
import { ChatWidget } from './ChatWidget';
import { CraneMark, IconToday, IconLeave, IconBoard, IconAdmin, IconAttendance, IconApproval, IconStats } from './icons';

// 채팅은 더 이상 별도 nav 항목이 아니다 — 아이콘 레일 하단의 채팅 위젯(알림
// 벨 옆)이 진입점이고, 전체 화면이 필요하면 위젯 안의 "전체 화면" 버튼으로
// /chat 라우트에 간다(라우트 자체는 그대로 있음).
const NAV_ITEMS = [
  { to: '/', label: '대시보드', end: true, Icon: IconToday },
  { to: '/leave', label: '연차', end: false, Icon: IconLeave },
  { to: '/board', label: '게시판', end: false, Icon: IconBoard },
];

// 근태 관리자(MANAGER)/관리자(ADMIN) 권한이 있을 때만 노출 — 일반 사원 눈에는
// 아예 안 보인다. 백엔드도 어차피 각 컨트롤러에서 같은 권한을 요구하므로
// 이건 UX 정리용이지 실제 접근 통제는 AdminRoute + 백엔드 @PreAuthorize가 한다.
const ADMIN_NAV_ITEMS = [
  { to: '/admin/employees', label: '사원 관리', end: false, Icon: IconAdmin },
  { to: '/admin/attendance', label: '근태 관리', end: false, Icon: IconAttendance },
  { to: '/admin/annual', label: '연차 결재', end: false, Icon: IconApproval },
  { to: '/admin/stats', label: '통계', end: false, Icon: IconStats },
];

const PAGE_TITLE: Record<string, string> = {
  '/': '대시보드',
  '/leave': '연차',
  '/board': '게시판',
  '/chat': '채팅',
  '/admin/employees': '사원 관리',
  '/admin/attendance': '근태 관리',
  '/admin/annual': '연차 결재',
  '/admin/stats': '통계',
};

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const title =
    PAGE_TITLE[location.pathname] ??
    (location.pathname.startsWith('/board') ? '게시판' : '출근하자');

  const isAdmin = useIsAdmin();

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
        <div className="rail-mark" title="출근하자"><CraneMark size={30} /></div>
        <nav className="rail-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `rail-item${isActive ? ' active' : ''}`}
            >
              <item.Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
          {isAdmin &&
            ADMIN_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `rail-item${isActive ? ' active' : ''}`}
              >
                <item.Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            ))}
        </nav>
        <div className="rail-bottom">
          <NotificationBell />
          {/* /chat 페이지에선 같은 기능이 이미 전체 화면으로 떠 있으니 위젯은 다른
              화면에서만 렌더링한다(그래야 위젯의 백그라운드 소켓도 그 화면에서만 연결됨). */}
          {!location.pathname.startsWith('/chat') && <ChatWidget />}
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
                    <p style={{ fontSize: 12, color: 'var(--ink-fade)', margin: '2px 0 0' }}>{user.depart}</p>
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
          <div style={{ display: 'flex', alignItems: 'baseline', minWidth: 0 }}>
            <h1>{title}</h1>
            <span className="doc-date">
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })}
            </span>
          </div>
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
