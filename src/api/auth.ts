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
  /**
   * 소셜 로그인 중 같은 이메일 계정이 있을 때(MEMBER409-1): 그 계정 비밀번호를 확인하고 연결한 뒤 로그인한다.
   * 비밀번호가 틀리면 MEMBER401-0, 10분이 지났으면 MEMBER400-0
   */
  socialLink: (password: string) => api<LoginResponse>(`${BASE}/social/link`, { method: 'POST', body: { password } }),
  /** 같은 이메일 계정에 연결하지 않고 소셜 계정으로 새 회원을 만든다. 10분이 지났으면 MEMBER400-0 */
  socialStartNew: () => api<LoginResponse>(`${BASE}/social/start-new`, { method: 'POST' }),
  /** 소셜로만 가입한 회원이 이메일·비밀번호 로그인을 추가한다 (로그인 상태에서만) */
  addEmailLogin: (email: string, password: string) =>
    api<LoginResponse>(`${BASE}/login-methods/email`, { method: 'POST', body: { email, password } }),
}
