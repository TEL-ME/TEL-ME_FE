import { useQuery } from '@tanstack/react-query'
import { authApi } from '../../api/auth'

export type AdminAccess = 'admin' | 'forbidden' | 'login'

export const adminAccessKey = ['admin', 'access'] as const

/** 관리자 권한 확인: /auth/me의 role로 판단한다 (ADMIN → 관리자 · USER → 권한 없음 · GUEST → 로그인 필요) */
export async function checkAdminAccess(): Promise<AdminAccess> {
  const me = await authApi.me()
  if (me.role === 'ADMIN') return 'admin'
  return me.authenticated ? 'forbidden' : 'login'
}

export function useAdminAccess() {
  return useQuery({ queryKey: adminAccessKey, queryFn: checkAdminAccess, staleTime: 60_000, retry: false })
}
