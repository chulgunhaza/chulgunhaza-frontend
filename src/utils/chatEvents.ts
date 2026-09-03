// INFO : ChatPage(방 읽음 처리)와 Layout(네브 채팅 뱃지)은 서로 다른 컴포넌트 트리라
// 직접 props로 안 이어진다. 이 정도로 가벼운 "뭔가 읽었으니 뱃지 다시 계산해"
// 신호 하나 때문에 Context/상태 끌어올리기까지 가는 건 과해서, 커스텀 이벤트로
// 느슨하게 연결한다 — Layout이 마운트돼 있는 동안(=로그인된 모든 화면에서) 항상 듣는다.
export const CHAT_UNREAD_CHANGED_EVENT = 'chat-unread-changed';

export function notifyChatUnreadChanged() {
  window.dispatchEvent(new Event(CHAT_UNREAD_CHANGED_EVENT));
}
