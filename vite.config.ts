import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 백엔드 CORS 화이트리스트 기본값이 http://localhost:3000 이라, 그 포트에 맞춰 개발 서버를 띄운다.
// (SecurityConfig.corsConfigurationSource / AppCorsConfigurationSource, cors.allowed-origins 참고)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
  },
})
