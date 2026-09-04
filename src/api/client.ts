import axios from 'axios';

// 이 앱은 JSESSIONID 세션 쿠키 인증이라 withCredentials가 필수다.
// (SessionCheckFilter가 쿠키 기반 세션을 못 찾으면 무조건 401을 준다 — 참고: Authentication_Flow.excalidraw)
export const apiClient = axios.create({
  baseURL: 'http://localhost:8081',
  withCredentials: true,
});

// 백엔드가 "같은 세션으로 들어온 동시 요청"을 못 견딘다(Spring Session Data Redis의
// RedisSessionRepository.save()가 세션 존재 여부를 확인 후 저장하는데, 그 사이에 다른
// 동시 요청이 끼어들면 일부가 401/500으로 죽는다 — 자세한 내용은 백엔드 저장소의
// docs/troubleshooting-concurrent-session-race.md 참고). 로그인 직후 대시보드가 여러
// 컴포넌트(DashboardPage, useChatUnreadCount, ChatWidget)에서 동시에 API를 부르는 게
// 실제 트리거였다. 백엔드 세션 구조를 고치는 대신, 여기서 요청을 한 번에 하나씩만
// 내보내도록 직렬화해서 애초에 동시 요청 자체가 안 생기게 막는다.
//
// config 객체별로 "이 요청이 끝났다"를 알려줄 release 콜백을 들고 있어야 하는데,
// axios 타입에 없는 필드를 config에 억지로 붙이지 않으려고 WeakMap으로 따로 관리한다
// (요청→응답/에러까지 axios가 같은 config 객체 참조를 그대로 넘겨준다는 점을 이용).
const releaseByConfig = new WeakMap<object, () => void>();
let requestQueueTail: Promise<void> = Promise.resolve();

apiClient.interceptors.request.use((config) => {
  return new Promise((resolve) => {
    // 이전 요청이 끝날 때까지 기다렸다가 이번 요청을 내보내고, 그 "내보냄" 자체를
    // 다음 요청이 기다릴 새 tail로 삼는다. release()는 응답 인터셉터에서 호출된다.
    requestQueueTail = requestQueueTail.then(
      () => new Promise<void>((release) => {
        releaseByConfig.set(config, release);
        resolve(config);
      }),
    );
  });
});

apiClient.interceptors.response.use(
  (response) => {
    releaseByConfig.get(response.config)?.();
    return response;
  },
  (error) => {
    if (error.config) releaseByConfig.get(error.config)?.();
    return Promise.reject(error);
  },
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
