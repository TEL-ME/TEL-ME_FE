import { useQuery } from '@tanstack/react-query'
import { authApi } from '../../api/auth'
import type { Me } from '../../api/types'
import { queryClient } from '../../lib/queryClient'
import { attachSession } from '../chat/chatRunStore'
import { liftRestriction } from '../chat/inputGuardStore'

export const meKey = ['auth', 'me'] as const
const GUEST: Me = { authenticated: false, userId: null, email: null, name: null, role: 'GUEST', loginMethods: [] }

export function useMe() {
  const query = useQuery({ queryKey: meKey, queryFn: authApi.me, staleTime: 5 * 60_000 })
  const me = query.data ?? GUEST
  return { me, isUser: me.authenticated, isAdmin: me.role === 'ADMIN', isLoading: query.isPending }
}

/** 로그인·가입 직후: 게스트 대화가 계정으로 옮겨지므로 대화 관련 캐시를 새로 읽는다 */
export async function afterLogin() {
  // 일시 제한은 사용자(게스트/회원)별이라 계정이 바뀌면 화면 제한을 풀고 서버 판단을 따른다
  liftRestriction()
  await queryClient.invalidateQueries({ queryKey: meKey })
  await queryClient.invalidateQueries({ queryKey: ['chat'] })
}

export async function logout() {
  try {
    await authApi.logout()
  } finally {
    // 로그아웃하면 이 기기에서는 새 게스트로 시작한다
    attachSession(null)
    liftRestriction()
    queryClient.removeQueries({ queryKey: ['chat'] })
    queryClient.setQueryData(meKey, GUEST)
    await queryClient.invalidateQueries({ queryKey: meKey })
  }
}
