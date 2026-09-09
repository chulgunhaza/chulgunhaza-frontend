import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

// #98: 세션 쿠키(JSESSIONID) → JWT(access_token/refresh_token httpOnly 쿠키) 전환.
// 둘 다 httpOnly 쿠키라 여전히 withCredentials가 필수다 — 백엔드
// JwtAuthenticationFilter가 access_token 쿠키를 못 찾으면 401을 준다.
export const apiClient = axios.create({
  baseURL: 'http://localhost:8081',
  withCredentials: true,
});

// #100: attendance-server가 별도 프로세스(:8082)로 분리되면서 근태 API만 다른
// baseURL을 써야 한다. 쿠키는 포트가 아니라 호스트 기준으로 스코프되므로
// (RFC 6265, Domain 미지정 시 정확히 그 호스트에만 매칭되지만 포트는 안 봄)
// user-server(:8081)에서 로그인해 받은 access_token/refresh_token 쿠키가
// attendance-server(:8082) 요청에도 그대로 실린다 — CORS만 attendance-server
// 쪽에서 허용해주면 된다(이미 같은 cors.allowed-origins 계약).
export const attendanceApiClient = axios.create({
  baseURL: 'http://localhost:8082',
  withCredentials: true,
});

// #101: chatting-server가 별도 프로세스(:8083)로 분리되면서 채팅 API만 다른
// baseURL을 써야 한다 — attendanceApiClient(#100)와 완전히 같은 이유(쿠키는
// 호스트 기준 스코프라 포트가 달라도 그대로 실린다, CORS만 chatting-server
// 쪽에서 허용).
export const chattingApiClient = axios.create({
  baseURL: 'http://localhost:8083',
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
// #100: apiClient/attendanceApiClient 양쪽 요청이 동시에 401나도 재발급은
// 프로세스 전체에서 하나로 합쳐야 하므로, 이 프라미스는 두 클라이언트가 공유한다
// (재발급은 항상 user-server(:8081)의 엔드포인트를 호출 — attendanceApiClient로
// 실패한 요청이어도 마찬가지. 재발급 성공 시 새 쿠키는 호스트 기준이라 두
// 클라이언트 모두에 적용된다).
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

function attachRefreshInterceptor(instance: AxiosInstance): void {
  instance.interceptors.response.use(
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
        return instance(config);
      } catch {
        // 재발급도 실패 — refresh 토큰마저 만료/무효라는 뜻이므로 원래 401을 그대로
        // 전달한다. 로그인 페이지로 보내는 건 이 계층이 아니라 호출부(ProtectedRoute
        // 등)의 몫으로 남겨둔다.
        return Promise.reject(error);
      }
    }
  );
}

attachRefreshInterceptor(apiClient);
attachRefreshInterceptor(attendanceApiClient);
attachRefreshInterceptor(chattingApiClient);

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
