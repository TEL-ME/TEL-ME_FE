import { api } from './client'
import type { LoginResponse, Me } from './types'

const BASE = '/api/v1/auth'

export const authApi = {
  /** 백엔드에 아직 없음(요청 예정) — 지금은 MSW 가짜 응답 */
  me: () => api<Me>(`${BASE}/me`),
  login: (email: string, password: string) =>
    api<LoginResponse>(`${BASE}/login`, { method: 'POST', body: { email, password } }),
  /** name은 백엔드 SignUpRequest에 추가 요청 예정 — 그 전에는 백엔드가 무시한다 */
  signup: (name: string, email: string, password: string) =>
    api<LoginResponse>(`${BASE}/signup`, { method: 'POST', body: { name, email, password } }),
  logout: () => api<null>(`${BASE}/logout`, { method: 'POST' }),
}
