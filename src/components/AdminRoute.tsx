import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useIsAdmin } from '../hooks/useIsAdmin';

// ProtectedRoute는 "로그인했는지"만 본다. 관리자 화면은 그 위에 한 단계 더 —
// 각 컨트롤러의 관리자 액션이 전부 MANAGER 권한으로 막혀있어서 백엔드는 어차피
// 403을 주지만, 권한 없는 사용자가 화면 자체를 보지 못하게 여기서 먼저 막아 UX를
// 정리한다.
export function AdminRoute({ children }: { children: ReactNode }) {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
