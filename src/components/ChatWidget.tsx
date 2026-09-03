import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getChatRooms, getChatMessages, sendChatMessage } from '../api/chat';
import { useChatSocket } from '../hooks/useChatSocket';
import { useChatUnreadCount } from '../hooks/useChatUnreadCount';
import type { ChatRoomListResponseDto, ChatMessageListResponseDto, ChatReadEvent } from '../types/chat';
import { toApiError } from '../api/client';
import { notifyChatUnreadChanged } from '../utils/chatEvents';

const WIDGET_ROOM_PAGE_SIZE = 20;
const WIDGET_MESSAGE_PAGE_SIZE = 30;

// INFO : /chat 전체 페이지와는 별개로, 다른 화면(대시보드/게시판)을 보다가도 바로
// 답장할 수 있게 만든 빠른 채팅 위젯. 아이콘 레일 하단, 알림 벨 옆에 자리잡은
// 버튼으로 열고 닫는다(계정 메뉴·알림 팝오버와 같은 관용구 — 트리거 옆에서
// 팝오버가 펼쳐진다). "지금 보고 있는 화면을 벗어나지 않고 온 김에 확인하고
// 답장" 용도라, 방 목록 페이징이나 과거 메시지 무한 스크롤 같은 깊은 탐색
// 기능은 전체 페이지(ChatPage) 몫으로 남겨두고 최근 방 20개 + 최신 메시지 한
// 페이지만 가볍게 다룬다. /chat 페이지 자체에서는 Layout이 이 컴포넌트를 아예
// 렌더링하지 않는다(같은 기능이 이미 전체 화면으로 떠 있는데 위젯까지 겹칠 이유가 없음).
export function ChatWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useChatUnreadCount(!!user, location.pathname);

  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState<ChatRoomListResponseDto[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [activeRoom, setActiveRoom] = useState<ChatRoomListResponseDto | null>(null);
  const [messages, setMessages] = useState<ChatMessageListResponseDto[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);

  // 패널 바깥을 클릭하면 닫는다 (계정 메뉴 등 이 앱의 다른 팝오버들과 같은 관용구).
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Esc: 방을 보고 있으면 목록으로, 목록이면 패널 자체를 닫는다.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (activeRoom) setActiveRoom(null);
      else setOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, activeRoom]);

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const res = await getChatRooms(0, WIDGET_ROOM_PAGE_SIZE);
      setRooms(res.contents);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  function togglePanel() {
    setOpen((v) => {
      const next = !v;
      if (next) loadRooms();
      else setActiveRoom(null);
      return next;
    });
  }

  // 방 목록 뱃지를 클릭 즉시 0으로 지우는 것도 ChatPage.selectRoom과 같은 이유:
  // 실제 읽음 처리는 뒤이은 메시지 조회가 트리거하지만, 그 응답을 기다리는 동안
  // 뱃지가 남아있으면 "눌렀는데 안 지워진다"는 인상을 준다.
  function selectRoom(room: ChatRoomListResponseDto) {
    setActiveRoom(room);
    setRooms((prev) => prev.map((r) => (r.roomId === room.roomId ? { ...r, unReadMessageCount: 0 } : r)));
    if (room.unReadMessageCount > 0) notifyChatUnreadChanged();
  }

  const loadMessages = useCallback(async (roomId: number) => {
    try {
      const res = await getChatMessages(roomId, 0, WIDGET_MESSAGE_PAGE_SIZE);
      setMessages(res.contents.slice().reverse());
    } catch (err) {
      setError(toApiError(err).message);
    }
  }, []);

  useEffect(() => {
    if (!activeRoom) return;
    setMessages([]);
    loadMessages(activeRoom.roomId);
  }, [activeRoom, loadMessages]);

  useLayoutEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // 패널이 닫혀 있거나 방을 안 보고 있을 땐 소켓 자체를 안 연다 — 위젯은 모든
  // 화면에 항상 떠 있는 컴포넌트라, 접혀 있는 동안까지 백그라운드 WebSocket을
  // 유지하면 로그인해 있는 내내 불필요한 연결이 하나 더 열려 있게 된다.
  const { connected } = useChatSocket(
    activeRoom?.roomId ?? null,
    (raw) => {
      const data = raw as Record<string, unknown>;

      if (data && data.type === 'read' && Array.isArray(data.updates)) {
        const updates = data.updates as ChatReadEvent['updates'];
        setMessages((prev) =>
          prev.map((m) => {
            const update = updates.find((u) => u.messageId === m.messageId);
            return update ? { ...m, unReadCount: update.unReadCount } : m;
          }),
        );
        return;
      }

      if (data && typeof data.message === 'string') {
        setMessages((prev) => [
          ...prev,
          {
            messageId: 0,
            senderId: typeof data.senderId === 'number' ? data.senderId : -1,
            message: data.message as string,
            roomId: activeRoom?.roomId ?? 0,
            createdTime: new Date().toISOString(),
            unReadCount: 0,
          },
        ]);
        // ChatPage와 같은 이유: 지금 이 방을 보고 있다는 뜻이니 읽음 처리(markReadUpTo)를
        // 트리거하는 GET을 백그라운드로 한 번 더 불러준다.
        if (activeRoom) {
          getChatMessages(activeRoom.roomId, 0, WIDGET_MESSAGE_PAGE_SIZE)
            .then(() => notifyChatUnreadChanged())
            .catch(() => {});
        }
      }
    },
    open && !!activeRoom,
  );

  async function handleSend() {
    if (!activeRoom || !draft.trim() || !user) return;
    if (draft.trim().length > 300) {
      setError('채팅 메시지는 최대 300자까지 입력할 수 있습니다.');
      return;
    }
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    const text = draft.trim();
    setDraft('');
    try {
      await sendChatMessage(activeRoom.roomId, text);
      setMessages((prev) => [
        ...prev,
        {
          messageId: 0,
          senderId: user.id,
          message: text,
          roomId: activeRoom.roomId,
          createdTime: new Date().toISOString(),
          unReadCount: activeRoom.members.length,
        },
      ]);
      setError(null);
    } catch (err) {
      setError(toApiError(err).message);
      setDraft(text);
    } finally {
      isSendingRef.current = false;
    }
  }

  function senderName(senderId: number): string {
    if (senderId === user?.id) return '나';
    return activeRoom?.members.find((m) => m.id === senderId)?.name ?? '알 수 없음';
  }

  function openFullPage() {
    setOpen(false);
    navigate('/chat');
  }

  if (!user) return null;

  return (
    <div style={{ position: 'relative' }} ref={rootRef}>
      <button className="rail-chat-trigger" onClick={togglePanel} title="채팅" aria-label="빠른 채팅 열기">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        {unreadCount > 0 && !open && (
          <span className="rail-chat-trigger-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div
          className="card popover-panel chat-widget-panel"
          style={{
            position: 'absolute',
            bottom: 0,
            left: '100%',
            marginLeft: 10,
            zIndex: 20,
            ['--popover-origin' as string]: 'bottom left',
          }}
        >
          {!activeRoom ? (
            <>
              <div className="chat-widget-header">
                <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>채팅</p>
                <button className="btn" style={{ padding: '3px 10px', fontSize: 11.5 }} onClick={openFullPage}>
                  전체 화면
                </button>
              </div>
              <div className="chat-widget-room-list">
                {rooms.length === 0 && !roomsLoading && (
                  <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>채팅방이 없습니다.</p>
                )}
                {rooms.map((room) => (
                  <button key={room.roomId} className="btn room-item" onClick={() => selectRoom(room)}>
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {room.roomName}
                      {room.group && (
                        <span className="pill" style={{ fontSize: 10, padding: '1px 6px' }}>
                          {room.members.length + 1}인
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--ink-faint)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {room.lastMessage ?? '대화를 시작해보세요'}
                      </div>
                      {room.unReadMessageCount > 0 && (
                        <span className="unread-badge">{room.unReadMessageCount > 99 ? '99+' : room.unReadMessageCount}</span>
                      )}
                    </div>
                  </button>
                ))}
                {roomsLoading && <p style={{ fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center' }}>불러오는 중...</p>}
              </div>
            </>
          ) : (
            <>
              <div className="chat-widget-header">
                <button
                  className="btn chat-widget-back"
                  onClick={() => setActiveRoom(null)}
                  title="목록으로"
                  aria-label="목록으로"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeRoom.roomName}
                  </b>
                  <span
                    className={`status-dot ${connected ? 'online' : 'offline'}`}
                    title={connected ? '실시간 연결됨' : '연결 중'}
                  />
                </div>
                <button className="btn" style={{ padding: '3px 10px', fontSize: 11.5 }} onClick={openFullPage}>
                  전체 화면
                </button>
              </div>
              <div ref={messagesRef} className="chat-widget-messages">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className="chat-bubble-row"
                    style={{ alignSelf: m.senderId === user?.id ? 'flex-end' : 'flex-start' }}
                  >
                    {activeRoom.group && m.senderId !== user?.id && (
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 2 }}>{senderName(m.senderId)}</div>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: 4,
                        flexDirection: m.senderId === user?.id ? 'row' : 'row-reverse',
                      }}
                    >
                      {m.senderId === user?.id && m.unReadCount > 0 && (
                        <span className="unread-count-hint">{m.unReadCount}</span>
                      )}
                      <div className={`chat-bubble ${m.senderId === user?.id ? 'mine' : 'theirs'}`}>{m.message}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input
                  className="chat-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      handleSend();
                    }
                  }}
                  placeholder="메시지 입력"
                />
                <button className="btn btn-primary" onClick={handleSend}>
                  전송
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="error-text" style={{ position: 'fixed', bottom: 16, right: 16, maxWidth: 280, zIndex: 30 }}>
          {error}
        </p>
      )}
    </div>
  );
}
