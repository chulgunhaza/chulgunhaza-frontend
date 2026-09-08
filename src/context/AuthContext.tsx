import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { login as loginApi, logout as logoutApi, me as meApi } from '../api/auth';
import type { LoginResponse } from '../types/employee';

interface AuthContextValue {
  user: LoginResponse | null;
  // #98: 앱 부팅 시 /me로 로그인 상태를 확인하는 동안 true. ProtectedRoute가 이
  // 값이 true인 동안엔 로그인 페이지로 리다이렉트하지 않고 기다린다 — 안 그러면
  // (새 탭이라 sessionStorage 캐시는 비어있지만 쿠키는 유효한 경우) 확인도 하기
  // 전에 잘못 로그아웃 취급해버린다.
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// sessionStorage 캐시는 새로고침 시 화면을 즉시 그리기 위한 용도일 뿐이고, 진짜
// 로그인 유효성은 아래 useEffect의 /me 호출로 서버에 직접 확인한다(#98 이전엔 이
// 확인 API 자체가 없어서 캐시만 믿고 있었다).
const STORAGE_KEY = 'chulgunhaza.user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoginResponse | null>(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LoginResponse) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    meApi()
      .then((res) => {
        if (cancelled) return;
        setUser(res);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(res));
      })
      .catch(() => {
        // access_token도 refresh_token도 없거나 둘 다 무효 — 로그아웃 상태로 확정.
        // (access_token만 만료된 경우는 apiClient의 응답 인터셉터가 이미 재발급을
        // 시도해봤을 것이므로, 여기까지 실패했다면 진짜로 로그인이 필요한 상태다.)
        if (cancelled) return;
        setUser(null);
        sessionStorage.removeItem(STORAGE_KEY);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginApi(email, password);
    setUser(res);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(res));
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } finally {
      setUser(null);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
