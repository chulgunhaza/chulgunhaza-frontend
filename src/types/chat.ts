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
  senderId: number;
  message: string;
  roomId: number; // 백엔드 필드명은 RoomId(대문자)지만 getter가 getRoomId()라 JSON은 roomId로 내려온다
  createdTime: string;
  // read(메시지당 읽음 여부)는 백엔드에서 제거됨 — 그룹 채팅에서는 "누가 읽었는지"가 사람마다
  // 달라서 메시지 하나에 boolean 하나로 표현이 안 됐다. 읽음/안읽음은 이제
  // ChatRoomListResponseDto.unReadMessageCount(사람별로 정확히 계산)로만 확인한다.
}

// WebSocketMessageHandler가 받는 클라이언트 프로토콜 (커스텀, STOMP 아님)
export interface WsSubscribeMessage {
  type: 'subscribe' | 'unsubscribe';
  chatRoomId: number;
}
