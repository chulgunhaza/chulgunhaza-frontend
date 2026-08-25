import { apiClient } from './client';
import type { LoginResponse } from '../types/employee';

// 로그인은 @RestController가 아니라 Spring Security의 UsernamePasswordAuthenticationFilter가
// 직접 처리한다 (그래서 /v3/api-docs에 안 나온다). SecurityConfig에 usernameParameter/
// passwordParameter 커스텀이 없어서 기본값인 "username"/"password"를 form-urlencoded로 보낸다.
// "username" 자리에는 UserDetailServiceImpl.loadUserByUsername(email) 기준으로 이메일을 넣는다.
export async function login(email: string, password: string): Promise<LoginResponse> {
  const form = new URLSearchParams();
  form.set('username', email);
  form.set('password', password);

  const res = await apiClient.post<LoginResponse>('/v1/employee/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/v1/employee/logout');
}
