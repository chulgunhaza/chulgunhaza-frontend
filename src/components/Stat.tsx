// 연차 요약(대시보드/연차 페이지)과 통계 카드에서 공통으로 쓰는 라벨+값 타일.
// 원래 DashboardPage 안에 지역 함수로만 있었는데, 페이지가 나뉘면서(연차 페이지 분리)
// 두 곳에서 똑같은 모양이 필요해져 컴포넌트로 뺐다.
export function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div className={`stat-value${highlight ? ' highlight' : ''}`}>{value}</div>
    </div>
  );
}
