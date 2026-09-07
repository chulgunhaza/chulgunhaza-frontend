import { apiClient } from './client';
import type {
  PostCreateRequestDto,
  PostModifyRequestDto,
  PostSearchResponseDto,
  PostListResponseDto,
} from '../types/post';
import type { PageDto } from '../types/common';

export async function getPostList(category: string, page = 0, size = 10): Promise<PageDto<PostListResponseDto>> {
  const res = await apiClient.get<PageDto<PostListResponseDto>>('/v1/post', {
    params: { category, page, size },
  });
  return res.data;
}

export async function getPost(postNumber: number): Promise<PostSearchResponseDto> {
  const res = await apiClient.get<PostSearchResponseDto>(`/v1/post/${postNumber}`);
  return res.data;
}

// PostController.create는 @RequestPart(JSON) + @RequestParam("list")(파일 목록, required)로 받는다.
// LocalFileServiceImpl.savePostFiles()는 files.get(0)을 바로 호출하기 때문에, "list" 파트가
// 하나도 없으면 IndexOutOfBoundsException으로 500이 난다 — 그래서 파일이 없을 때도 항상
// 빈 파일(originalFilename="") 1개를 끼워 보낸다 (백엔드가 그 경우엔 null로 정상 처리하도록 이미 짜여 있음).
export async function createPost(dto: PostCreateRequestDto, files: File[]): Promise<number> {
  const form = new FormData();
  form.append('dto', new Blob([JSON.stringify(dto)], { type: 'application/json' }));

  const filesToSend = files.length > 0 ? files : [new File([], '')];
  filesToSend.forEach((file) => form.append('list', file));

  const res = await apiClient.post<number>('/v1/post/create', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function modifyPost(postNumber: number, dto: PostModifyRequestDto, files: File[]): Promise<number> {
  const form = new FormData();
  form.append('dto', new Blob([JSON.stringify(dto)], { type: 'application/json' }));

  const filesToSend = files.length > 0 ? files : [new File([], '')];
  filesToSend.forEach((file) => form.append('list', file));

  const res = await apiClient.put<number>(`/v1/post/modify/${postNumber}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function deletePost(postNumber: number): Promise<void> {
  await apiClient.patch(`/v1/post/delete/${postNumber}`);
}

// MANAGER 권한 필요. 반환값은 토글 후 상태.
export async function togglePostPin(postNumber: number): Promise<boolean> {
  const res = await apiClient.patch<boolean>(`/v1/post/${postNumber}/pin`);
  return res.data;
}
