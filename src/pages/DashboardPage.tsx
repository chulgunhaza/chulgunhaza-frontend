import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getEmployee } from '../api/employee';
import { registerAttendance } from '../api/attendance';
import { getChatRooms } from '../api/chat';
import { getPostList } from '../api/post';
import type { Annual } from '../types/employee';
import type { ChatRoomListResponseDto } from '../types/chat';
import type { PostListResponseDto } from '../types/post';
import { toApiError } from '../api/client';
import { useChatUnreadCount } from '../hooks/useChatUnreadCount';
import { Stat } from '../components/Stat';

const BOARD_PREVIEW_CATEGORY = '공지';
const PREVIEW_SIZE = 5;

// INFO : 메인 페이지(대시보드) — 매일 켜서 한눈에 확인하는 용도라, 각 기능의
// 요약만 보여주고 실제 조작(연차 신청, 채팅 답장, 글쓰기)은 각자의 전용
// 페이지/위젯으로 보낸다. 연차 신청 폼은 예전엔 여기 있었는데, 대시보드가
// "한눈에 보기" 화면이라는 성격과 안 맞아서 /leave 페이지로 옮겼다.
export function DashboardPage() {
  const { user } = useAuth();
  const { unreadCount: chatUnreadCount } = useChatUnreadCount(!!user, undefined);

  const [annual, setAnnual] = useState<Annual | null>(null);
  const [annualError, setAnnualError] = useState<string | null>(null);

  const [checkInStatus, setCheckInStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [checkInError, setCheckInError] = useState<string | null>(null);

  const [postCount, setPostCount] = useState<number | null>(null);
  const [recentPosts, setRecentPosts] = useState<PostListResponseDto[]>([]);
  const [boardError, setBoardError] = useState<string | null>(null);

  const [recentRooms, setRecentRooms] = useState<ChatRoomListResponseDto[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    getEmployee(user.id)
      .then((emp) => setAnnual(emp.annual))
      .catch((err) => setAnnualError(toApiError(err).message));

    getPostList(BOARD_PREVIEW_CATEGORY, 0, PREVIEW_SIZE)
      .then((res) => {
        setPostCount(res.totalElements);
        setRecentPosts(res.contents);
      })
      .catch((err) => setBoardError(toApiError(err).message));

    getChatRooms(0, PREVIEW_SIZE)
      .then((res) => setRecentRooms(res.contents))
      .catch((err) => setChatError(toApiError(err).message));
  }, [user]);

  async function handleCheckIn() {
    if (!user) return;
    setCheckInStatus('sending');
    setCheckInError(null);
    try {
      await registerAttendance(user.employeeNo, new Date());
      setCheckInStatus('sent');
    } catch (err) {
      setCheckInStatus('error');
      setCheckInError(toApiError(err).message);
    }
  }

  return (
    <div className="dashboard-grid">
      <div className="card span-2">
        <h3 style={{ marginTop: 0 }}>통계</h3>
        <div className="stat-tile-row">
          <div>
            <div className="stat-label">오늘 출근</div>
            {checkInStatus === 'sent' ? (
              <div className="stat-value highlight">등록 완료</div>
            ) : (
              <button className="btn btn-primary" style={{ marginTop: 2 }} onClick={handleCheckIn} disabled={checkInStatus === 'sending'}>
                {checkInStatus === 'sending' ? '등록 중...' : '지금 출근 등록'}
              </button>
            )}
            {checkInStatus === 'error' && <p className="error-text" style={{ marginTop: 6, marginBottom: 0 }}>{checkInError}</p>}
          </div>
          <Stat label="안읽은 채팅" value={chatUnreadCount > 0 ? `${chatUnreadCount}건` : '없음'} highlight={chatUnreadCount > 0} />
          <Stat label="게시글 수" value={postCount === null ? '-' : `${postCount}건`} />
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 12, marginBottom: 0 }}>
          백엔드에 출근 기록 조회 API가 없어, 등록 결과만 확인할 수 있습니다. (RabbitMQ로 비동기 처리되어 등록
          즉시 응답이 오지만 실제 저장은 백그라운드에서 이뤄집니다.)
        </p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>연차 요약</h3>
          <Link to="/leave" className="btn btn-primary" style={{ padding: '5px 12px', fontSize: 12.5 }}>
            연차 신청하기
          </Link>
        </div>
        {annualError && <p className="error-text">{annualError}</p>}
        {annual && (
          <div className="stat-tile-row" style={{ marginTop: 12 }}>
            <Stat label="총 연차" value={`${annual.totalAnnualCount}일`} />
            <Stat label="사용" value={`${annual.useCount}일`} />
            <Stat label="잔여" value={`${annual.remainingAnnualCount}일`} highlight />
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>채팅</h3>
          <Link to="/chat" className="btn" style={{ padding: '5px 12px', fontSize: 12.5 }}>
            전체보기
          </Link>
        </div>
        {chatError && <p className="error-text">{chatError}</p>}
        {recentRooms.length === 0 && !chatError && (
          <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>채팅방이 없습니다.</p>
        )}
        <div className="preview-list">
          {recentRooms.map((room) => (
            <Link key={room.roomId} to="/chat" className="preview-row">
              <span style={{ minWidth: 0 }}>
                <span className="preview-row-title">{room.roomName}</span>
                <span className="preview-row-sub">{room.lastMessage ?? '대화를 시작해보세요'}</span>
              </span>
              {room.unReadMessageCount > 0 && (
                <span className="unread-badge">{room.unReadMessageCount > 99 ? '99+' : room.unReadMessageCount}</span>
              )}
            </Link>
          ))}
        </div>
      </div>

      <div className="card span-2">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>게시판</h3>
          <Link to="/board" className="btn" style={{ padding: '5px 12px', fontSize: 12.5 }}>
            전체보기
          </Link>
        </div>
        {boardError && <p className="error-text">{boardError}</p>}
        {recentPosts.length === 0 && !boardError && (
          <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>게시글이 없습니다.</p>
        )}
        <div className="preview-list">
          {recentPosts.map((post) => (
            <Link key={post.postNumber} to={`/board/${post.postNumber}`} className="preview-row">
              <span style={{ minWidth: 0 }}>
                <span className="preview-row-title">{post.title}</span>
                <span className="preview-row-sub">{post.author ?? '알 수 없음'} · {new Date(post.createdAt).toLocaleDateString()}</span>
              </span>
              <span className="preview-row-sub">조회 {post.count}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
