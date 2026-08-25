import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getChatRooms, getChatMessages, sendChatMessage, createChatRoom } from '../api/chat';
import { getEmployeeList } from '../api/employee';
import { useChatSocket } from '../hooks/useChatSocket';
import type { ChatRoomListResponseDto, ChatMessageListResponseDto } from '../types/chat';
import type { EmployeeListResponseDto } from '../types/employee';
import { toApiError } from '../api/client';

export function ChatPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoomListResponseDto[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoomListResponseDto | null>(null);
  const [messages, setMessages] = useState<ChatMessageListResponseDto[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [employees, setEmployees] = useState<EmployeeListResponseDto[]>([]);

  const loadRooms = useCallback(async () => {
    try {
      const res = await getChatRooms();
      setRooms(res.contents);
    } catch (err) {
      setError(toApiError(err).message);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (!activeRoom) return;
    getChatMessages(activeRoom.roomId)
      .then((res) => setMessages(res.contents.slice().reverse()))
      .catch((err) => setError(toApiError(err).message));
  }, [activeRoom]);

  // 실시간 수신: WebSocket으로 새 메시지가 오면 REST로 받아온 목록에 이어붙인다.
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
    if (draft.trim().length < 10) {
      setError('채팅 메시지는 최소 10자 이상이어야 합니다. (백엔드 검증 규칙)');
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
      await loadRooms();
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 56px)' }}>
      <div className="card" style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>채팅방</h3>
          <button className="btn" onClick={openPicker}>
            + 새 채팅
          </button>
        </div>
        {rooms.length === 0 && <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>채팅방이 없습니다.</p>}
        {rooms.map((room) => (
          <button
            key={room.roomId}
            className="btn"
            style={{
              textAlign: 'left',
              background: activeRoom?.roomId === room.roomId ? 'var(--accent-soft)' : undefined,
            }}
            onClick={() => setActiveRoom(room)}
          >
            <div style={{ fontWeight: 700 }}>{room.userName}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{room.lastMessage ?? '대화를 시작해보세요'}</div>
          </button>
        ))}

        {pickerOpen && (
          <div className="card" style={{ position: 'absolute', zIndex: 10, width: 240 }}>
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
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.senderId === user?.id ? 'flex-end' : 'flex-start',
                    background: m.senderId === user?.id ? 'var(--accent-soft)' : 'var(--surface-2)',
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
                placeholder="메시지 입력 (10자 이상)"
              />
              <button className="btn btn-primary" onClick={handleSend}>
                전송
              </button>
            </div>
          </>
        )}
      </div>
      {error && <p className="error-text" style={{ position: 'fixed', bottom: 16, right: 16 }}>{error}</p>}
    </div>
  );
}
