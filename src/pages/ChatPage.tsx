import { useCallback, useEffect, useLayoutEffect, useRef, useState, type UIEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { getChatRooms, getChatMessages, sendChatMessage, createChatRoom, leaveChatRoom } from '../api/chat';
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
  // 메시지를 보내거나(내가) 실시간으로 받았을 때(상대가) 맨 아래로 스크롤하라는 신호.
  // prepend(과거 메시지 로드)와는 별개 트리거라 ref로 구분해서 useLayoutEffect에서 처리한다.
  const scrollToBottomRef = useRef(false);
  // handleSend 이중 호출(더블클릭, IME Enter 겹침 등) 방어용 락.
  const isSendingRef = useRef(false);

  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [employees, setEmployees] = useState<EmployeeListResponseDto[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

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

  // 최초 진입 시, 메시지를 보내거나 실시간으로 받았을 땐 맨 아래(최신 메시지)로,
  // 이전 메시지를 앞에 붙였을 땐 스크롤 위치를 유지한다.
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
    } else if (scrollToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      scrollToBottomRef.current = false;
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
      scrollToBottomRef.current = true;
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
    // 이중 클릭/이중 Enter 등 어떤 경로로든 handleSend가 겹쳐 호출되면 같은 메시지가
    // 두 번 전송될 수 있어 방어적으로 막는다. draft를 즉시 비우는 것도 같은 이유.
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    const text = draft.trim();
    setDraft('');
    try {
      await sendChatMessage(activeRoom.roomId, text);
      scrollToBottomRef.current = true;
      setMessages((prev) => [
        ...prev,
        { senderId: user.id, message: text, roomId: activeRoom.roomId, createdTime: new Date().toISOString(), read: false },
      ]);
      setError(null);
    } catch (err) {
      setError(toApiError(err).message);
      setDraft(text); // 실패했으면 입력값 복원
    } finally {
      isSendingRef.current = false;
    }
  }

  async function openPicker() {
    setPickerOpen(true);
    setSelectedMemberIds([]);
    try {
      const res = await getEmployeeList(0, 50);
      setEmployees(res.contents.filter((e) => e.id !== user?.id));
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  function toggleMember(id: number) {
    setSelectedMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  async function startChat() {
    if (selectedMemberIds.length === 0) return;
    try {
      await createChatRoom({ memberIds: selectedMemberIds });
      setPickerOpen(false);
      setSelectedMemberIds([]);
      await loadRooms(0, false);
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  async function handleLeaveRoom() {
    if (!activeRoom) return;
    if (!window.confirm(`'${activeRoom.roomName}' 대화방을 나가시겠습니까?`)) return;
    try {
      await leaveChatRoom(activeRoom.roomId);
      setActiveRoom(null);
      await loadRooms(0, false);
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  // 그룹 채팅에서 말풍선 위에 보여줄 발신자 이름 (1:1은 굳이 표시할 필요 없음)
  function senderName(senderId: number): string {
    if (senderId === user?.id) return '나';
    return activeRoom?.members.find((m) => m.id === senderId)?.name ?? '알 수 없음';
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
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                {room.roomName}
                {room.group && (
                  <span className="pill" style={{ fontSize: 10, padding: '1px 6px' }}>
                    {room.members.length + 1}인
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{room.lastMessage ?? '대화를 시작해보세요'}</div>
            </button>
          ))}
          {roomsLoading && <p style={{ fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center' }}>불러오는 중...</p>}
        </div>

        {pickerOpen && (
          <div className="card" style={{ position: 'absolute', zIndex: 10, width: 260, maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontSize: 12.5, marginTop: 0, marginBottom: 4 }}>
              대화 상대 선택 <span style={{ color: 'var(--ink-faint)' }}>(여러 명 선택 시 단체 채팅)</span>
            </p>
            {employees.map((e) => (
              <label
                key={e.id}
                className="btn"
                style={{ width: '100%', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={selectedMemberIds.includes(e.id)}
                  onChange={() => toggleMember(e.id)}
                />
                {e.name} ({e.department})
              </label>
            ))}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={selectedMemberIds.length === 0}
                onClick={startChat}
              >
                {selectedMemberIds.length > 1 ? `단체 채팅 시작 (${selectedMemberIds.length}명)` : '채팅 시작'}
              </button>
              <button className="btn" onClick={() => setPickerOpen(false)}>
                닫기
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!activeRoom ? (
          <p style={{ color: 'var(--ink-faint)' }}>왼쪽에서 채팅방을 선택하세요.</p>
        ) : (
          <>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <b>{activeRoom.roomName}</b>{' '}
                <span className={`pill ${connected ? 'good' : 'warn'}`}>{connected ? '실시간 연결됨' : '연결 중'}</span>
              </div>
              <button className="btn" onClick={handleLeaveRoom}>
                나가기
              </button>
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
                    maxWidth: '70%',
                  }}
                >
                  {activeRoom.group && m.senderId !== user?.id && (
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 2 }}>{senderName(m.senderId)}</div>
                  )}
                  <div
                    style={{
                      background: m.senderId === user?.id ? 'var(--brand-soft)' : 'var(--surface-2)',
                      padding: '8px 12px',
                      borderRadius: 10,
                    }}
                  >
                    {m.message}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8 }}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  // 한글 입력 중 조합 완성을 위해 누르는 Enter까지 전송으로 잡히면
                  // (IME composing 상태의 keydown이 또 한 번 real Enter로 이어지면서)
                  // 메시지가 2번 전송되는 문제가 있었다 — isComposing일 땐 무시.
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
      {error && (
        <p className="error-text" style={{ position: 'fixed', bottom: 16, right: 16 }}>
          {error}
        </p>
      )}
    </div>
  );
}
