import { useEffect, useRef } from 'react';
import { openChatSse } from '../api/notification';
import type { ChatNotificationEvent } from '../types/chat';

// useMainSse와 같은 로그인 직후 세션 레이스 완화책(#46 계열 이슈) — 막 생성된
// 세션에 SSE 연결이 너무 빨리 붙으면 Redis 세션 커밋 타이밍과 겹쳐 500/401이
// 날 수 있어 살짝 지연시킨다.
const POST_LOGIN_SSE_DELAY_MS = 400;

// 채팅 전용 SSE 채널(ChatAlarmService) 구독. 백엔드가 "이 방을 지금 실시간
// WebSocket으로 보고 있지 않은 수신자"에게만 폴백으로 보내주는 채널이라,
// 여기로 오는 이벤트는 곧 "지금 안 보고 있던 방에 새 메시지가 왔다"는
// 뜻이다 — 위젯이 접혀 있거나 다른 방을 보고 있을 때의 실시간 알람 용도로
// 쓴다(같은 방을 이미 열어서 보고 있으면 WS로 오지 SSE로는 안 온다).
export function useChatSse(enabled: boolean, onNotification: (event: ChatNotificationEvent) => void) {
  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;

  useEffect(() => {
    if (!enabled) return;

    let source: EventSource | null = null;
    const timer = setTimeout(() => {
      source = openChatSse();
      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ChatNotificationEvent;
          onNotificationRef.current(data);
        } catch {
          // ChatSseConnect 같은 초기 연결 핸드셰이크 문자열은 무시
        }
      };
    }, POST_LOGIN_SSE_DELAY_MS);

    return () => {
      clearTimeout(timer);
      source?.close();
    };
  }, [enabled]);
}
