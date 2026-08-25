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
      <button
        className="rail-item"
        style={{ position: 'relative' }}
        onClick={() => setOpen((v) => !v)}
        title="알림"
      >
        <span className="rail-icon">🔔</span>
        <span>알림</span>
        {notifications.length > 0 && (
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
            {notifications.length}
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
            width: 280,
            maxHeight: 320,
            overflowY: 'auto',
            zIndex: 20,
          }}
        >
          <p style={{ fontSize: 12.5, fontWeight: 700, marginTop: 0, marginBottom: 10 }}>알림</p>
          {notifications.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-faint)', margin: 0 }}>아직 받은 알림이 없습니다.</p>
          ) : (
            <ul className="notif-list">
              {notifications.map((n, i) => (
                <li key={i} className="notif-item">
                  {n.message}
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>
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
