const BASE_URL = 'http://localhost:8081';

// NotificationController.subscribeChat/subscribeMain 은 GET + text/event-stream.
// 세션 쿠키(JSESSIONID)로 인증하므로 withCredentials가 반드시 필요하다.
export function openChatSse(): EventSource {
  return new EventSource(`${BASE_URL}/v1/notifications/subscribe/chat`, { withCredentials: true });
}

export function openMainSse(): EventSource {
  return new EventSource(`${BASE_URL}/v1/notifications/subscribe/main`, { withCredentials: true });
}
