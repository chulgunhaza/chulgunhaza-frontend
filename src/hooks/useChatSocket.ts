import { useEffect, useRef, useState, useCallback } from 'react';
import type { ChatMessageListResponseDto } from '../types/chat';

const WS_URL = 'ws://localhost:8081/websocket';

/**
 * WebSocketMessageHandler(커스텀 프로토콜, STOMP 아님)와 통신한다.
 * - 연결 후 {"type":"subscribe","chatRoomId":N} 을 보내야 그 방의 실시간 push를 받는다.
 * - 인증은 쿠키(JSESSIONID) 기반인데, 브라우저 WebSocket API는 커스텀 헤더를 못 보낸다.
 *   대신 같은 오리진 정책상 쿠키는 핸드셰이크 요청에 자동으로 실리고,
 *   SecurityContextInterceptor(WebSocketConfig)가 그 쿠키로 세션을 읽어 인증한다.
 */
export function useChatSocket(roomId: number | null, onMessage: (raw: unknown) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        onMessageRef.current(JSON.parse(event.data));
      } catch {
        onMessageRef.current(event.data);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);

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
