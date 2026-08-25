import { apiClient } from './client';
import type {
  ChatRoomCreateRequestDto,
  ChatRoomListResponseDto,
  ChatMessageCreateRequestDto,
  ChatMessageListResponseDto,
} from '../types/chat';
import type { PageDto } from '../types/common';

export async function createChatRoom(dto: ChatRoomCreateRequestDto): Promise<number> {
  const res = await apiClient.post<number>('/v1/chat/create', dto);
  return res.data;
}

export async function getChatRooms(page = 0, size = 20): Promise<PageDto<ChatRoomListResponseDto>> {
  const res = await apiClient.get<PageDto<ChatRoomListResponseDto>>('/v1/chat/find/rooms', {
    params: { page, size },
  });
  return res.data;
}

export async function getChatMessages(
  roomId: number,
  page = 0,
  size = 30,
): Promise<PageDto<ChatMessageListResponseDto>> {
  const res = await apiClient.get<PageDto<ChatMessageListResponseDto>>(`/v1/chat/find/${roomId}`, {
    params: { page, size },
  });
  return res.data;
}

// 실제 메시지 전달은 REST(HTTP)로 보내고, RabbitMQ를 거쳐 WebSocket으로 상대에게 push된다.
// (WebSocket 채널 자체는 subscribe/unsubscribe 신호를 보내는 용도 — chat.ts의 message는
// createTime을 클라이언트가 직접 채워야 해서 여기서 ISO 로컬 문자열로 변환한다.)
export async function sendChatMessage(
  roomId: number,
  receiverId: number,
  message: string,
): Promise<void> {
  const dto: ChatMessageCreateRequestDto = {
    roomId,
    receiverId,
    message,
    createTime: toLocalDateTimeString(new Date()),
  };
  await apiClient.post('/v1/chat/send', dto);
}

function toLocalDateTimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
