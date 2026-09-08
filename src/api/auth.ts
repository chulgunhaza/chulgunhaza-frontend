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

// #98: 새로고침 시 "지금 로그인 상태인지"를 서버에 직접 물어보는 용도.
// access_token 쿠키가 유효하면 로그인 응답과 같은 shape로 사원 정보를 돌려준다.
export async function me(): Promise<LoginResponse> {
  const res = await apiClient.get<LoginResponse>('/v1/employee/me');
  return res.data;
}

// #98: access 토큰(15분) 만료 시 호출. client.ts의 응답 인터셉터가 401을 받으면
// 이 함수를 호출해서 재발급받은 뒤 원래 요청을 재시도한다.
export async function refreshToken(): Promise<LoginResponse> {
  const res = await apiClient.post<LoginResponse>('/v1/employee/token/refresh');
  return res.data;
}
