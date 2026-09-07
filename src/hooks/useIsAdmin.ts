import { useAuth } from '../context/AuthContext';

// 근태 관리자(MANAGER)/관리자(ADMIN) 권한 여부. Layout(nav 노출), AdminRoute(라우트
// 가드), 게시판(공지 고정 버튼 노출) 등 여러 곳에서 같은 판정이 필요해서 훅으로 뺐다.
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return user?.employeeRoles.some((role) => role === 'MANAGER' || role === 'ADMIN') ?? false;
}
