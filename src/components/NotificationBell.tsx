import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMainSse } from '../hooks/useMainSse';

export function NotificationBell() {
  const { user } = useAuth();
  const notifications = useMainSse(!!user);
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button className="btn" style={{ width: '100%' }} onClick={() => setOpen((v) => !v)}>
        🔔 알림 {notifications.length > 0 && <span className="pill good">{notifications.length}</span>}
      </button>
      {open && (
        <div
          className="card"
          style={{ position: 'absolute', bottom: '110%', left: 0, width: 260, maxHeight: 280, overflowY: 'auto' }}
        >
          {notifications.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-faint)', margin: 0 }}>아직 받은 알림이 없습니다.</p>
          ) : (
            <ul className="notif-list">
              {notifications.map((n, i) => (
                <li key={i} className="notif-item">
                  {n.message}
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
                    {new Date(n.occurredAt).toLocaleTimeString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
