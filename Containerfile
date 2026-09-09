# k8s(vm-deploy.sh) 배포용 멀티스테이지 빌드. 로컬 npm run dev 워크플로에는
# 영향 없음 — 이 이미지는 정적 빌드 산출물(dist/)만 nginx로 서빙한다.
#
# VITE_* 빌드 인자는 전부 선택값이다 — 안 주면 vite-env.d.ts에 문서화된 대로
# src/api/client.ts / useChatSocket.ts의 localhost 기본값이 그대로 굳는다.
# vm-deploy.sh는 포트포워딩 없이 VM IP로 직접 접근하는 배포이므로 이 값들을
# 반드시 VM IP 기준으로 채워서 빌드한다.
FROM docker.io/library/node:20-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL
ARG VITE_ATTENDANCE_API_BASE_URL
ARG VITE_CHATTING_API_BASE_URL
ARG VITE_WS_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_ATTENDANCE_API_BASE_URL=${VITE_ATTENDANCE_API_BASE_URL} \
    VITE_CHATTING_API_BASE_URL=${VITE_CHATTING_API_BASE_URL} \
    VITE_WS_URL=${VITE_WS_URL}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM docker.io/library/nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
