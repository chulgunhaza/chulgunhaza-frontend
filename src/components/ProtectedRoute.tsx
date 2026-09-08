import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  // #98: /me로 로그인 상태 확인 중엔 아직 결과를 모르니 섣불리 로그인 페이지로
  // 보내지 않는다 — 특히 새 탭(sessionStorage 캐시 없음)에서 쿠키는 유효한 경우.
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
