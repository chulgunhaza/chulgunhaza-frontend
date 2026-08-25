import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMainSse } from '../hooks/useMainSse';

export function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAllRead, clearAll } = useMainSse(!!user);
  const [open, setOpen] = useState(false);

  if (!user) return null;

  function toggle() {
    setOpen((v) => {
      const next = !v;
      // 네이버웍스처럼 패널을 열면(=확인하면) 안 읽음 뱃지를 지운다
      if (next) markAllRead();
      return next;
    });
  }

  return (
    <div style={{ position: 'relative' }}>
      <button className="rail-item" style={{ position: 'relative' }} onClick={toggle} title="알림">
        <span className="rail-icon">🔔</span>
        <span>알림</span>
        {unreadCount > 0 && (
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
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div
          className="card"
          style={{
            position: 'absolute',
            bottom: 0,
            left: '100%',
            marginLeft: 10,
            width: 300,
            maxHeight: 360,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, margin: 0 }}>알림</p>
            {notifications.length > 0 && (
              <button
                className="btn"
                style={{ padding: '3px 10px', fontSize: 11.5 }}
                onClick={clearAll}
              >
                전체 확인 완료
              </button>
            )}
          </div>
          <div style={{ overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--ink-faint)', margin: 0 }}>아직 받은 알림이 없습니다.</p>
            ) : (
              <ul className="notif-list">
                {notifications.map((n) => (
                  <li key={n.id} className="notif-item" style={{ opacity: n.read ? 0.55 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      {!n.read && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 999,
                            background: 'var(--danger)',
                            marginTop: 5,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <div>
                        {n.message}
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>
                          {new Date(n.occurredAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
