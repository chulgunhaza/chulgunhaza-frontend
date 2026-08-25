import axios from 'axios';

// 이 앱은 JSESSIONID 세션 쿠키 인증이라 withCredentials가 필수다.
// (SessionCheckFilter가 쿠키 기반 세션을 못 찾으면 무조건 401을 준다 — 참고: Authentication_Flow.excalidraw)
export const apiClient = axios.create({
  baseURL: 'http://localhost:8081',
  withCredentials: true,
});

export interface ApiError {
  status: number;
  message: string;
}

export function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 0;
    const body = err.response?.data as { error?: string; message?: string } | undefined;
    const message = body?.error ?? body?.message ?? err.message ?? '알 수 없는 오류가 발생했습니다.';
    return { status, message };
  }
  return { status: 0, message: '알 수 없는 오류가 발생했습니다.' };
}
