import { useEffect, useRef, useState, useCallback } from 'react';
import type { ChatMessageListResponseDto } from '../types/chat';

const WS_URL = 'ws://localhost:8081/websocket';
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 10000;

/**
 * WebSocketMessageHandler(커스텀 프로토콜, STOMP 아님)와 통신한다.
 * - 연결 후 {"type":"subscribe","chatRoomId":N} 을 보내야 그 방의 실시간 push를 받는다.
 * - 인증은 쿠키(JSESSIONID) 기반인데, 브라우저 WebSocket API는 커스텀 헤더를 못 보낸다.
 *   대신 같은 오리진 정책상 쿠키는 핸드셰이크 요청에 자동으로 실리고,
 *   SecurityContextInterceptor(WebSocketConfig)가 그 쿠키로 세션을 읽어 인증한다.
 * - 백엔드 재시작(dev용 devtools 자동 재시작 포함)이나 네트워크 순단으로 연결이
 *   끊기면 점점 늘어나는 딜레이(최대 10초)로 자동 재연결을 시도한다 — 예전엔
 *   한 번 끊기면 페이지를 새로고침하기 전까진 "연결 중" 표시에 영영 머물러 있었다.
 */
export function useChatSocket(roomId: number | null, onMessage: (raw: unknown) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const shouldReconnectRef = useRef(true);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    shouldReconnectRef.current = true;

    function scheduleReconnect() {
      if (!shouldReconnectRef.current) return;
      const attempt = reconnectAttemptRef.current + 1;
      reconnectAttemptRef.current = attempt;
      const delay = Math.min(RECONNECT_BASE_DELAY_MS * attempt, RECONNECT_MAX_DELAY_MS);
      reconnectTimerRef.current = setTimeout(() => {
        if (shouldReconnectRef.current) connect();
      }, delay);
    }

    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptRef.current = 0;
        setConnected(true);
      };
      ws.onclose = () => {
        setConnected(false);
        scheduleReconnect();
      };
      ws.onerror = () => {
        setConnected(false);
      };
      ws.onmessage = (event) => {
        try {
          onMessageRef.current(JSON.parse(event.data));
        } catch {
          onMessageRef.current(event.data);
        }
      };
    }

    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  // 재연결로 새 WebSocket이 열릴 때마다(=connected가 다시 true가 될 때마다)
  // 현재 보고 있는 방을 다시 subscribe한다 — 재연결 직후에도 실시간 수신이 이어지도록.
  useEffect(() => {
    if (!connected || roomId === null || !wsRef.current) return;

    wsRef.current.send(JSON.stringify({ type: 'subscribe', chatRoomId: roomId }));
    return () => {
      wsRef.current?.send(JSON.stringify({ type: 'unsubscribe', chatRoomId: roomId }));
    };
  }, [connected, roomId]);

  const send = useCallback((data: unknown) => {
    wsRef.current?.send(JSON.stringify(data));
  }, []);

  return { connected, send };
}

export type { ChatMessageListResponseDto };
