import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '../../api/client'

export type AdminAccess = 'admin' | 'forbidden' | 'login'

export const adminAccessKey = ['admin', 'access'] as const

/**
 * 관리자 권한 확인. /auth/me에 role이 생기기 전까지는 관리자 API(/api/v1/admin/**, ADMIN만 허용)를
 * 가볍게 한 번 불러서 판단한다: 200 → 관리자 · 403 → 일반 회원 · 401 → 로그인 필요
 */
export async function checkAdminAccess(): Promise<AdminAccess> {
  try {
    await api('/api/v1/admin/faqs', { query: { size: 1 } })
    return 'admin'
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) return 'forbidden'
    if (e instanceof ApiError && e.status === 401) return 'login'
    throw e
  }
}

export function useAdminAccess() {
  return useQuery({ queryKey: adminAccessKey, queryFn: checkAdminAccess, staleTime: 60_000, retry: false })
}
