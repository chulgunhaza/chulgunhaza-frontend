import { useEffect, useState, useRef } from 'react';
import { openMainSse } from '../api/notification';

export interface MainNotification {
  receiverEmployeeNo: number;
  message: string;
  occurredAt: string;
}

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
          const data = JSON.parse(event.data) as MainNotification;
          setNotifications((prev) => [data, ...prev].slice(0, 20));
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

  return notifications;
}
