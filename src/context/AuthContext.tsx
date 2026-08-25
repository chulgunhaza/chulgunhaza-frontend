import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { login as loginApi, logout as logoutApi } from '../api/auth';
import type { LoginResponse } from '../types/employee';

interface AuthContextValue {
  user: LoginResponse | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// 서버가 세션 쿠키만 내려주고 "지금 로그인 상태인지" 확인할 별도 API(/me 같은)가 없어서,
// 새로고침하면 로그인 정보가 날아간다. sessionStorage에 로그인 응답을 캐싱해서 완화한다
// (진짜 세션 유효성은 여전히 서버가 쥐고 있고, 이건 어디까지나 화면 표시용 캐시다).
const STORAGE_KEY = 'chulgunhaza.user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoginResponse | null>(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LoginResponse) : null;
  });

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

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
