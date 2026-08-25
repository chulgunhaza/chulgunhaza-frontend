import type { Position } from './employee';

export interface ChatRoomCreateRequestDto {
  // 대화 상대 아이디 목록. 1명이면 1:1, 2명 이상이면 단체 채팅방.
  // senderId는 서버가 인증 세션에서 가져오므로 클라이언트가 보내지 않는다.
  memberIds: number[];
}

export interface ChatRoomMemberDto {
  id: number;
  employeeNo: number;
  name: string;
  position: Position;
  department: string;
}

export interface ChatRoomListResponseDto {
  roomId: number;
  group: boolean;
  roomName: string; // 1:1이면 상대 이름, 그룹이면 "A, B 외 N명"
  members: ChatRoomMemberDto[]; // 나를 제외한 참여자 전원
  lastMessage: string | null;
  unReadMessageCount: number;
  lastMessageTime: string | null;
}

export interface ChatMessageCreateRequestDto {
  // roomId만으로 서버가 방 참여자 전원에게 전달하므로 receiverId는 더 이상 보내지 않는다.
  message: string; // 1~300자
  roomId: number;
  createTime: string; // yyyy-MM-dd'T'HH:mm:ss
}

export interface ChatMessageListResponseDto {
  messageId: number; // 실시간 읽음 알림(ChatReadEvent)이 어떤 메시지를 가리키는지 매칭하는 데 쓴다
  senderId: number;
  message: string;
  roomId: number; // 백엔드 필드명은 RoomId(대문자)지만 getter가 getRoomId()라 JSON은 roomId로 내려온다
  createdTime: string;
  // 이 메시지를 아직 안 읽은 방 참여자 수(발신자 본인 제외). 카카오톡 단톡방처럼 각자
  // 읽을 때마다 하나씩 줄고, 전원 읽으면 0. 예전엔 메시지당 boolean 하나(read)라 그룹
  // 채팅에서 "몇 명이 안 읽었는지"를 표현할 수 없었다.
  unReadCount: number;
}

// 누군가 방을 읽으면 서버가 실시간으로 쏴주는 이벤트 — "읽으면 실시간으로 사라져야지"
// 피드백으로 추가. 새 채팅 메시지 payload(message 필드 있음)와는 type으로 구분한다.
export interface ChatReadEvent {
  type: 'read';
  roomId: number;
  readerId: number;
  updates: { messageId: number; unReadCount: number }[];
}

// WebSocketMessageHandler가 받는 클라이언트 프로토콜 (커스텀, STOMP 아님)
export interface WsSubscribeMessage {
  type: 'subscribe' | 'unsubscribe';
  chatRoomId: number;
}
