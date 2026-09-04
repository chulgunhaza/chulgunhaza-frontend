// 스텝 카드의 접기 순서도 썸네일 — 실제 오리주루 크리스 패턴처럼 직선 크리스와
// 접기 화살표만으로 그린 도형. variant마다 다른 접기 단계를 나타낸다.
const PATTERNS = [
  // 01 — 정사각형 대각선 크리스 (시작)
  <>
    <rect x="18" y="6" width="64" height="64" fill="none" />
    <path d="M18 6 L82 70 M82 6 L18 70" opacity="0.6" />
    <path d="M50 6 L50 70" opacity="0.35" strokeDasharray="3 3" />
  </>,
  // 02 — 삼각 접기 (위로)
  <>
    <rect x="18" y="6" width="64" height="64" fill="none" opacity="0.4" strokeDasharray="3 3" />
    <path d="M18 70 L50 6 L82 70 Z" fill="none" />
    <path d="M30 52 Q50 66 70 52" fill="none" opacity="0.7" />
    <path d="M70 52 L64 52 M70 52 L67 58" opacity="0.7" />
  </>,
  // 03 — 연 접기 (가운데 모으기)
  <>
    <path d="M50 6 L82 38 L50 70 L18 38 Z" fill="none" />
    <path d="M18 38 L82 38 M50 6 L50 70" opacity="0.35" strokeDasharray="3 3" />
    <path d="M26 22 L40 34 M74 22 L60 34" opacity="0.7" />
    <path d="M40 34 L34 31 M40 34 L36 39 M60 34 L66 31 M60 34 L64 39" opacity="0.7" />
  </>,
  // 04 — 학의 날개 (벌어지는 접기)
  <>
    <path d="M50 70 L50 22" fill="none" opacity="0.35" strokeDasharray="3 3" />
    <path d="M50 22 L14 58 L50 70 Z M50 22 L86 58 L50 70 Z" fill="none" />
    <path d="M50 22 L50 10" opacity="0.7" />
    <path d="M50 10 L46 16 M50 10 L54 16" opacity="0.7" />
  </>,
];

export function FoldDiagram({ variant }: { variant: number }) {
  return (
    <svg
      className="fold-diagram"
      viewBox="0 0 100 76"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATTERNS[variant % PATTERNS.length]}
    </svg>
  );
}
