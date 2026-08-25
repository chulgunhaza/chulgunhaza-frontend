import { useCallback, useEffect, useLayoutEffect, useRef, useState, type UIEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { getChatRooms, getChatMessages, sendChatMessage, createChatRoom } from '../api/chat';
import { getEmployeeList } from '../api/employee';
import { useChatSocket } from '../hooks/useChatSocket';
import type { ChatRoomListResponseDto, ChatMessageListResponseDto } from '../types/chat';
import type { EmployeeListResponseDto } from '../types/employee';
import { toApiError } from '../api/client';

const ROOM_PAGE_SIZE = 20;
const MESSAGE_PAGE_SIZE = 30;
const SCROLL_LOAD_THRESHOLD = 60; // px

export function ChatPage() {
  const { user } = useAuth();

  // ---- 채팅방 목록 (아래로 스크롤 페이징) ----
  const [rooms, setRooms] = useState<ChatRoomListResponseDto[]>([]);
  const [roomsPage, setRoomsPage] = useState(0);
  const [roomsHasMore, setRoomsHasMore] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [activeRoom, setActiveRoom] = useState<ChatRoomListResponseDto | null>(null);

  // ---- 메시지 (위로 스크롤 시 이전 메시지 페이징) ----
  const [messages, setMessages] = useState<ChatMessageListResponseDto[]>([]);
  const [messagesPage, setMessagesPage] = useState(0);
  const [messagesHasMore, setMessagesHasMore] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const prependFromHeightRef = useRef<number | null>(null);
  const isInitialLoadRef = useRef(true);

  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [employees, setEmployees] = useState<EmployeeListResponseDto[]>([]);

  // ---------- 채팅방 목록 로드 ----------
  const loadRooms = useCallback(async (page: number, append: boolean) => {
    setRoomsLoading(true);
    try {
      const res = await getChatRooms(page, ROOM_PAGE_SIZE);
      setRooms((prev) => (append ? [...prev, ...res.contents] : res.contents));
      setRoomsHasMore(!res.isLastPage);
      setRoomsPage(page);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms(0, false);
  }, [loadRooms]);

  function handleRoomsScroll(e: UIEvent<HTMLDivElement>) {
    if (roomsLoading || !roomsHasMore) return;
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_LOAD_THRESHOLD) {
      loadRooms(roomsPage + 1, true);
    }
  }

  // ---------- 메시지 로드 ----------
  const loadMessages = useCallback(async (roomId: number, page: number, mode: 'replace' | 'prepend') => {
    setMessagesLoading(true);
    try {
      const res = await getChatMessages(roomId, page, MESSAGE_PAGE_SIZE);
      // 백엔드는 최신순(DESC)으로 페이지를 내려주므로, 화면 표시(과거→최신) 순서로 뒤집는다.
      const chronological = res.contents.slice().reverse();
      if (mode === 'replace') {
        setMessages(chronological);
      } else {
        // 위로 스크롤해서 옛날 메시지를 앞에 붙이기 직전 높이를 기록해둔다 (스크롤 위치 보존용).
        prependFromHeightRef.current = messagesRef.current?.scrollHeight ?? null;
        setMessages((prev) => [...chronological, ...prev]);
      }
      setMessagesHasMore(!res.isLastPage);
      setMessagesPage(page);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeRoom) return;
    isInitialLoadRef.current = true;
    setMessages([]);
    setMessagesPage(0);
    setMessagesHasMore(true);
    loadMessages(activeRoom.roomId, 0, 'replace');
  }, [activeRoom, loadMessages]);

  // 최초 진입 시엔 맨 아래(최신 메시지)로, 이전 메시지를 앞에 붙였을 땐 스크롤 위치를 유지한다.
  useLayoutEffect(() => {
    const el = messagesRef.current;
    if (!el) return;

    if (prependFromHeightRef.current !== null) {
      const diff = el.scrollHeight - prependFromHeightRef.current;
      el.scrollTop += diff;
      prependFromHeightRef.current = null;
    } else if (isInitialLoadRef.current && messages.length > 0) {
      el.scrollTop = el.scrollHeight;
      isInitialLoadRef.current = false;
    }
  }, [messages]);

  function handleMessagesScroll(e: UIEvent<HTMLDivElement>) {
    if (messagesLoading || !messagesHasMore || !activeRoom) return;
    if (e.currentTarget.scrollTop < SCROLL_LOAD_THRESHOLD) {
      loadMessages(activeRoom.roomId, messagesPage + 1, 'prepend');
    }
  }

  // ---------- 실시간 수신 ----------
  // WebSocket으로 새 메시지가 오면 REST로 받아온 목록 맨 뒤에 이어붙인다.
  // (WebSocketMessageHandler가 push하는 payload 형태가 REST 응답과 100% 같다는 보장이 없어
  // 방어적으로 필드를 확인한 뒤 반영한다)
  const { connected } = useChatSocket(activeRoom?.roomId ?? null, (raw) => {
    const data = raw as Partial<ChatMessageListResponseDto> & { message?: string };
    if (data && typeof data.message === 'string') {
      setMessages((prev) => [
        ...prev,
        {
          senderId: data.senderId ?? -1,
          message: data.message!,
          roomId: activeRoom?.roomId ?? 0,
          createdTime: new Date().toISOString(),
          read: false,
        },
      ]);
    }
  });

  async function handleSend() {
    if (!activeRoom || !draft.trim() || !user) return;
    if (draft.trim().length > 300) {
      setError('채팅 메시지는 최대 300자까지 입력할 수 있습니다.');
      return;
    }
    try {
      // receiverId: 방 목록 DTO의 employeeId는 "상대방"의 id (내가 아닌 상대 쪽 참여자 레코드 기준)
      await sendChatMessage(activeRoom.roomId, activeRoom.employeeId, draft.trim());
      setMessages((prev) => [
        ...prev,
        { senderId: user.id, message: draft.trim(), roomId: activeRoom.roomId, createdTime: new Date().toISOString(), read: false },
      ]);
      setDraft('');
      setError(null);
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  async function openPicker() {
    setPickerOpen(true);
    try {
      const res = await getEmployeeList(0, 50);
      setEmployees(res.contents.filter((e) => e.id !== user?.id));
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  async function startChatWith(receiverId: number) {
    if (!user) return;
    try {
      await createChatRoom({ senderId: user.id, receiverId });
      setPickerOpen(false);
      await loadRooms(0, false);
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 152px)' }}>
      <div className="card" style={{ width: 260, height: '100%', display: 'flex', flexDirection: 'column', gap: 8, padding: 16, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>채팅방</h3>
          <button className="btn" onClick={openPicker}>
            + 새 채팅
          </button>
        </div>

        <div
          style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}
          onScroll={handleRoomsScroll}
        >
          {rooms.length === 0 && !roomsLoading && (
            <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>채팅방이 없습니다.</p>
          )}
          {rooms.map((room) => (
            <button
              key={room.roomId}
              className="btn"
              style={{
                textAlign: 'left',
                background: activeRoom?.roomId === room.roomId ? 'var(--brand-soft)' : undefined,
              }}
              onClick={() => setActiveRoom(room)}
            >
              <div style={{ fontWeight: 700 }}>{room.userName}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{room.lastMessage ?? '대화를 시작해보세요'}</div>
            </button>
          ))}
          {roomsLoading && <p style={{ fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center' }}>불러오는 중...</p>}
        </div>

        {pickerOpen && (
          <div className="card" style={{ position: 'absolute', zIndex: 10, width: 240, maxHeight: 320, overflowY: 'auto' }}>
            <p style={{ fontSize: 12.5, marginTop: 0 }}>대화 상대 선택</p>
            {employees.map((e) => (
              <button key={e.id} className="btn" style={{ width: '100%', marginBottom: 4 }} onClick={() => startChatWith(e.id)}>
                {e.name} ({e.department})
              </button>
            ))}
            <button className="btn" style={{ width: '100%' }} onClick={() => setPickerOpen(false)}>
              닫기
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!activeRoom ? (
          <p style={{ color: 'var(--ink-faint)' }}>왼쪽에서 채팅방을 선택하세요.</p>
        ) : (
          <>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 10 }}>
              <b>{activeRoom.userName}</b>{' '}
              <span className={`pill ${connected ? 'good' : 'warn'}`}>{connected ? '실시간 연결됨' : '연결 중'}</span>
            </div>
            <div
              ref={messagesRef}
              onScroll={handleMessagesScroll}
              style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              {messagesLoading && messagesPage > 0 && (
                <p style={{ fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center', margin: '4px 0' }}>
                  이전 메시지 불러오는 중...
                </p>
              )}
              {!messagesHasMore && messages.length > 0 && (
                <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', textAlign: 'center', margin: '4px 0' }}>
                  대화의 처음입니다
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.senderId === user?.id ? 'flex-end' : 'flex-start',
                    background: m.senderId === user?.id ? 'var(--brand-soft)' : 'var(--surface-2)',
                    padding: '8px 12px',
                    borderRadius: 10,
                    maxWidth: '70%',
                  }}
                >
                  {m.message}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8 }}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="메시지 입력"
              />
              <button className="btn btn-primary" onClick={handleSend}>
                전송
              </button>
            </div>
          </>
        )}
      </div>
      {error && (
        <p className="error-text" style={{ position: 'fixed', bottom: 16, right: 16 }}>
          {error}
        </p>
      )}
    </div>
  );
}
