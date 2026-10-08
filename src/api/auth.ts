import { api } from './client'
import type { LoginResponse, Me } from './types'

const BASE = '/api/v1/auth'

export const authApi = {
  /** 지금 로그인한 사람. 로그인 안 했으면 GUEST */
  me: () => api<Me>(`${BASE}/me`),
  login: (email: string, password: string) =>
    api<LoginResponse>(`${BASE}/login`, { method: 'POST', body: { email, password } }),
  /** name: 공백 제외 1~50자 */
  signup: (name: string, email: string, password: string) =>
    api<LoginResponse>(`${BASE}/signup`, { method: 'POST', body: { name, email, password } }),
  logout: () => api<null>(`${BASE}/logout`, { method: 'POST' }),
  /** 카카오로만 가입한 회원이 이메일·비밀번호 로그인을 추가한다 (로그인 상태에서만) */
  addEmailLogin: (email: string, password: string) =>
    api<LoginResponse>(`${BASE}/login-methods/email`, { method: 'POST', body: { email, password } }),
}
