import type { Position } from './employee';

export interface ChatRoomCreateRequestDto {
  senderId: number;
  receiverId: number;
}

export interface ChatRoomListResponseDto {
  roomId: number;
  employeeId: number;
  employeeNo: number;
  userName: string;
  position: Position;
  department: string;
  lastMessage: string | null;
  unReadMessageCount: number;
  lastMessageTime: string | null;
}

export interface ChatMessageCreateRequestDto {
  receiverId: number;
  message: string; // 10~300자
  roomId: number;
  createTime: string; // yyyy-MM-dd'T'HH:mm:ss
}

export interface ChatMessageListResponseDto {
  senderId: number;
  message: string;
  roomId: number; // 백엔드 필드명은 RoomId(대문자)지만 getter가 getRoomId()라 JSON은 roomId로 내려온다
  createdTime: string;
  read: boolean; // isRead() 게터 → Jackson 기본 규약상 JSON 필드명은 "read"
}

// WebSocketMessageHandler가 받는 클라이언트 프로토콜 (커스텀, STOMP 아님)
export interface WsSubscribeMessage {
  type: 'subscribe' | 'unsubscribe';
  chatRoomId: number;
}
