import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { openMainSse } from '../api/notification';

export interface MainNotification {
  id: number;
  receiverEmployeeNo: number;
  message: string;
  occurredAt: string;
  read: boolean;
}

type RawMainNotification = Omit<MainNotification, 'id' | 'read'>;

// #46 MAIN SSE 채널 구독. 로그인 안 된 상태에서 열면 401 나면서 EventSource가
// 계속 재연결을 시도하니, 반드시 로그인 이후에만 마운트해야 한다.
//
// 알려진 이슈: 로그인 직후 이 SSE 연결과 대시보드의 GET /v1/employee/list/{id} 가
// 거의 동시에 "막 생성된" 세션에 접근하면, Spring Session의 RedisSessionRepository가
// commitSession() 시점에 `IllegalStateException: Session was invalidated` 를 던지며
// 500/401이 나는 걸 실측으로 확인했다 (단순 새로고침 후 접근할 때는 재현 안 됨 —
// 세션이 이미 Redis에 안정적으로 존재하는 상태라 그럼. 즉 "막 로그인한 시점의 신규
// 세션에 대한 동시 요청"이 트리거 조건). 근본 원인은 Spring Session Redis 저장소 쪽
// 동시성 문제라 프론트에서 완전히 막을 수는 없고, 여기서는 로그인 직후 SSE 연결을
// 짧게 지연시켜 레이스 윈도우를 줄이는 완화책만 적용했다. 백엔드 쪽 근본 수정은 별도
// 이슈로 트래킹 필요.
const POST_LOGIN_SSE_DELAY_MS = 400;

// 서버는 알림에 고유 id를 안 실어 보내므로(occurredAt까지도 초 단위라 중복 가능),
// 프론트에서 수신 순서 기반으로 임의 id를 붙여 읽음 상태를 개별 추적한다.
let notificationSeq = 0;

export function useMainSse(enabled: boolean) {
  const [notifications, setNotifications] = useState<MainNotification[]>([]);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let source: EventSource | null = null;
    const timer = setTimeout(() => {
      source = openMainSse();
      sourceRef.current = source;

      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as RawMainNotification;
          const withId: MainNotification = { ...data, id: ++notificationSeq, read: false };
          setNotifications((prev) => [withId, ...prev].slice(0, 30));
        } catch {
          // ChatSseConnect/MainSseConnect 같은 초기 연결 핸드셰이크 문자열은 무시
        }
      };
    }, POST_LOGIN_SSE_DELAY_MS);

    return () => {
      clearTimeout(timer);
      source?.close();
      sourceRef.current = null;
    };
  }, [enabled]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => (prev.some((n) => !n.read) ? prev.map((n) => ({ ...n, read: true })) : prev));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  return { notifications, unreadCount, markAllRead, clearAll };
}
