---
version: 1
slug: "src-pages-dashboardpage-tsx"
primary_target: "src/pages/DashboardPage.tsx"
related_targets: ["src/index.css","src/components/Layout.tsx"]
---

# Surface brief — 대시보드 (/)

## Scope & mode
Operate. 매일 아침 처음 켜는 요약 화면: 오늘 근태 상태 확인 → 출근 등록 → 연차/게시판/채팅 진입.

## Audience, job, proof
사내 직원. 하루 시작의 첫 화면에서 "지금 상태"를 3초 안에 읽고 출근 등록을 끝낸다.
실시간 숫자(안읽음, 공지 수)가 곧 신뢰. 새로고침 없이 최신이어야 함.

## Chosen direction
오리주루 접기 순서 세계 (concept seed 24191329, 카탈로그 챌린저를 사용자가 채택).
승인 컴프: .impeccable/mocks/comp-a.webp (sidecar에 approved: true 기록됨).
하루 = 여섯 단계 접기. 버밀리온은 "살아있는 접기"(주 액션·현재 시각)에만 예약.
골드 도트 = 현재/라이브 상태 마커. 숫자는 전부 고정폭, 세로 정렬.

## Sampled palette (컴프 픽셀 실측)
- 지면(폴드 화이트): #e9e4dc · 레일(와시 크림): #d6cbb8
- 버밀리온 와시: #d1412b (카드 활성 #d9553f) · 골드 도트: #d0a229
- 수미 먹: #1a1a1a · 잉크 페이드: #8e8a83

## 구성 인벤토리 (승인 컴프 기준)
- 좌측 아이콘 레일: 와시 크림 지면, 종이학 라인 마크, 활성 항목 골드 도트 → semantic HTML + authored SVG
- 중앙 좌: 헤드라인 '오늘의 출근' + 눈금 메타 행 → HTML/CSS
- 중앙: 버밀리온 크리스 스퀘어 + 실시간 시계(고정폭) → 와시 질감은 raster(public/assets), 크리스 선은 SVG, 시계는 코드
- 우측 CURRENT FOLD 상태 열: 골드 도트 + 라이브 상태 → HTML/CSS
- 하단 스텝 스트립 01–06: 접기 다이어그램 썸네일 + 코너 폴드 호버 → authored SVG + CSS
- 섹션 구분: 크리스 헤어라인 → CSS

## Memorable moment
'출근 등록' 클릭 = 하루의 첫 접기: 버밀리온 스퀘어의 코너가 접히듯 들렸다가 '등록 완료'로 확정, 골드 도트가 다음 스텝으로 이동.

## Unresolved
없음 — 빌드 후 finish review로 검증.
