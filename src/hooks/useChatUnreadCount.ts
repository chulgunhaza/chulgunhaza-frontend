import { useCallback, useEffect, useState } from 'react';
import { getChatRooms } from '../api/chat';
import { CHAT_UNREAD_CHANGED_EVENT } from '../utils/chatEvents';

// INFO : 네브 레일의 "채팅" 항목에 안읽은 메시지 총합 뱃지를 달기 위한 훅.
// 채팅방 목록 자체가 곧 각 방의 unReadMessageCount를 갖고 있어서, 별도 집계
// API 없이 그걸 다 더해서 쓴다. 채팅방 자체가 많은 앱은 아니라 한 페이지(size=100)로
// 넉넉히 가져와서 합산 — 페이지네이션까지는 과함.
//
// 갱신 시점 두 가지: (1) 라우트가 바뀔 때(refreshKey) — 채팅 페이지를 벗어나거나
// 들어올 때 최신 상태로 맞춘다. (2) chat-unread-changed 이벤트 — 채팅 페이지 안에서
// 방을 읽었을 때(라우트는 안 바뀜) ChatPage가 이 이벤트를 쏴서, 네브 뱃지도 같은
// 화면 안에서 바로 줄어들게 한다("방 목록은 바로 지워지는데 네브 옆 숫자는 그대로"라는
// 어색함 방지).
export function useChatUnreadCount(enabled: boolean, refreshKey: unknown) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await getChatRooms(0, 100);
      const total = res.contents.reduce((sum, room) => sum + room.unReadMessageCount, 0);
      setUnreadCount(total);
    } catch {
      // 네브 뱃지는 있으면 좋은 부가 정보라, 실패(로그인 직후 세션 레이스 등)해도
      // 조용히 무시한다 — 에러 배너까지 띄울 정도는 아님.
    }
  }, [enabled]);

  useEffect(() => {
    // refreshKey는 값 자체를 쓰진 않고 "다시 불러올 시점"을 알리는 트리거로만 쓴다.
    refresh();
  }, [refresh, refreshKey]);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener(CHAT_UNREAD_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(CHAT_UNREAD_CHANGED_EVENT, refresh);
  }, [enabled, refresh]);

  return { unreadCount, refresh };
}
