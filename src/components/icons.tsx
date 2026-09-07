// 오리주루 세계의 아이콘 — 전부 직선 접기 자국(크리스) 문법으로 그린 단일 스트로크 SVG.
// 외부 아이콘 라이브러리를 쓰지 않고, 접기 다이어그램의 선 언어를 그대로 쓴다.
type IconProps = { size?: number };

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

// 종이학 마크 — 삼각형만으로 접힌 학
export function CraneMark({ size = 28 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden>
      <path d="M3 15 L12 4 L15 12 Z" />
      <path d="M12 4 L21 9 L15 12" />
      <path d="M15 12 L18 20 L10 17 Z" />
      <path d="M10 17 L4 20 L7 14" />
      <path d="M21 9 L23 7" />
    </svg>
  );
}

// 대시보드 — 접힌 정사각형(오늘의 한 장)
export function IconToday({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden>
      <rect x="4" y="4" width="16" height="16" />
      <path d="M4 4 L20 20 M20 4 L4 20 M12 4 L12 20" opacity="0.55" />
    </svg>
  );
}

// 연차 — 캘린더 위 대각선 크리스
export function IconLeave({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden>
      <rect x="4" y="6" width="16" height="14" />
      <path d="M4 10 L20 10" />
      <path d="M9 3 L9 7 M15 3 L15 7" />
      <path d="M4 20 L20 10" opacity="0.55" />
    </svg>
  );
}

// 게시판 — 핀으로 고정된 쪽지
export function IconBoard({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden>
      <path d="M6 4 L18 4 L18 20 L6 20 Z" />
      <path d="M9 9 L15 9 M9 13 L15 13 M9 17 L13 17" opacity="0.55" />
      <circle cx="12" cy="4" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

// 관리자 — 접힌 방패(권한/관리 영역을 지키는 형태)
export function IconAdmin({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden>
      <path d="M12 3 L19 6 L19 12 C19 16 16 19 12 21 C8 19 5 16 5 12 L5 6 Z" />
      <path d="M12 3 L12 21 M5 12 L19 12" opacity="0.55" />
    </svg>
  );
}

// 근태 관리 — 시계 위 체크(출근 도장을 찍는 순간)
export function IconAttendance({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8 L12 12 L15 14" opacity="0.55" />
    </svg>
  );
}

// 연차 결재 — 서류 위 도장(승인/반려 판정)
export function IconApproval({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden>
      <path d="M6 3 L18 3 L18 21 L6 21 Z" />
      <path d="M9 8 L15 8 M9 12 L13 12" opacity="0.55" />
      <circle cx="15" cy="16" r="3.2" />
    </svg>
  );
}

// 대시보드 통계 — 막대그래프
export function IconStats({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden>
      <path d="M4 20 L20 20" opacity="0.55" />
      <path d="M7 20 L7 12 M12 20 L12 6 M17 20 L17 15" />
    </svg>
  );
}
