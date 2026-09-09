/// <reference types="vite/client" />

// k8s 배포(scripts/vm-deploy.sh)에서 컨테이너 빌드 시점에 주입하는 값들.
// 전부 선택값 — 안 주면 client.ts/useChatSocket.ts의 localhost 기본값을 쓴다.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ATTENDANCE_API_BASE_URL?: string;
  readonly VITE_CHATTING_API_BASE_URL?: string;
  readonly VITE_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
