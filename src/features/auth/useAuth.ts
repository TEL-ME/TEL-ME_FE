import { useQuery } from '@tanstack/react-query'
import { authApi } from '../../api/auth'
import type { Me } from '../../api/types'
import { queryClient } from '../../lib/queryClient'
import { attachSession } from '../chat/chatRunStore'

export const meKey = ['auth', 'me'] as const
const GUEST: Me = { userId: null, email: null, name: null, role: 'GUEST' }

export function useMe() {
  const query = useQuery({ queryKey: meKey, queryFn: authApi.me, staleTime: 5 * 60_000 })
  const me = query.data ?? GUEST
  return { me, isUser: me.role !== 'GUEST', isAdmin: me.role === 'ADMIN', isLoading: query.isPending }
}

/** 로그인·가입 직후: 게스트 대화가 계정으로 옮겨지므로 대화 관련 캐시를 새로 읽는다 */
export async function afterLogin() {
  await queryClient.invalidateQueries({ queryKey: meKey })
  await queryClient.invalidateQueries({ queryKey: ['chat'] })
}

export async function logout() {
  try {
    await authApi.logout()
  } finally {
    // 로그아웃하면 이 기기에서는 새 게스트로 시작한다
    attachSession(null)
    queryClient.removeQueries({ queryKey: ['chat'] })
    queryClient.setQueryData(meKey, GUEST)
    await queryClient.invalidateQueries({ queryKey: meKey })
  }
}
