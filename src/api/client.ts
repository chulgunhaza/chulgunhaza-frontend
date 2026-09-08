import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

// #98: 세션 쿠키(JSESSIONID) → JWT(access_token/refresh_token httpOnly 쿠키) 전환.
// 둘 다 httpOnly 쿠키라 여전히 withCredentials가 필수다 — 백엔드
// JwtAuthenticationFilter가 access_token 쿠키를 못 찾으면 401을 준다.
export const apiClient = axios.create({
  baseURL: 'http://localhost:8081',
  withCredentials: true,
});

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const REFRESH_URL = '/v1/employee/token/refresh';

// access 토큰은 15분짜리라, 쓰다 보면 만료된 채로 요청이 나갈 수 있다. 401을 받으면
// 재발급을 한 번 시도하고 원래 요청을 재시도한다 — 동시에 여러 요청이 401나도
// 재발급은 이 프라미스 하나로 합쳐서 한 번만 호출한다(안 그러면 재발급 엔드포인트가
// refresh 토큰을 매번 회전시키므로 경쟁하는 요청끼리 서로의 새 토큰을 무효화시킴).
let refreshPromise: Promise<void> | null = null;

async function refreshAccessToken(): Promise<void> {
  if (!refreshPromise) {
    // auth.ts가 apiClient를 import하므로 정적 import로 묶으면 순환 참조가 생긴다 —
    // 인터셉터 호출 시점에만 필요하니 동적 import로 그 사이클을 끊는다.
    refreshPromise = import('./auth')
      .then(({ refreshToken }) => refreshToken())
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function isRefreshRequest(url?: string): boolean {
  return !!url && url.includes(REFRESH_URL);
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableRequestConfig | undefined;

    const shouldTryRefresh =
      error.response?.status === 401 &&
      config !== undefined &&
      !config._retry &&
      !isRefreshRequest(config.url);

    if (!shouldTryRefresh) {
      return Promise.reject(error);
    }

    config._retry = true;

    try {
      await refreshAccessToken();
      return apiClient(config);
    } catch {
      // 재발급도 실패 — refresh 토큰마저 만료/무효라는 뜻이므로 원래 401을 그대로
      // 전달한다. 로그인 페이지로 보내는 건 이 계층이 아니라 호출부(ProtectedRoute
      // 등)의 몫으로 남겨둔다.
      return Promise.reject(error);
    }
  }
);

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
