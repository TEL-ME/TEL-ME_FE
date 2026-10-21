import { useQuery } from '@tanstack/react-query'
import { authApi } from '../../api/auth'
import type { Me } from '../../api/types'
import { queryClient } from '../../lib/queryClient'
import { attachSession, stopBackgroundStreams } from '../chat/chatRunStore'
import { liftRestriction } from '../chat/inputGuardStore'

export const meKey = ['auth', 'me'] as const
const GUEST: Me = { authenticated: false, userId: null, email: null, name: null, role: 'GUEST', loginMethods: [] }

/**
 * 내 로그인 상태. 다른 탭에서 로그인·로그아웃했을 수 있어 이 탭으로 돌아오면 다시 확인한다.
 * recheck: 화면에 들어올 때마다 서버에 다시 묻는다. isChecking은 그 확인이 끝나기 전까지 true
 * (예전에 받아 둔 값만으로 로그인 여부를 판단하면 안 되는 화면에서 쓴다)
 */
export function useMe({ recheck = false }: { recheck?: boolean } = {}) {
  const query = useQuery({
    queryKey: meKey,
    queryFn: authApi.me,
    staleTime: 5 * 60_000,
    refetchOnMount: recheck ? 'always' : true,
    refetchOnWindowFocus: 'always',
  })
  const me = query.data ?? GUEST
  return {
    me,
    isUser: me.authenticated,
    isAdmin: me.role === 'ADMIN',
    isLoading: query.isPending,
    isChecking: recheck ? !query.isFetchedAfterMount : query.isPending,
  }
}

/** 로그인·가입 직후: 게스트 대화가 계정으로 옮겨지므로 대화 관련 캐시를 새로 읽는다 */
export async function afterLogin() {
  // 일시 제한은 사용자(게스트/회원)별이라 계정이 바뀌면 화면 제한을 풀고 서버 판단을 따른다
  liftRestriction()
  // 화면에 useMe가 없어도(콜백 화면 등) 다음 화면이 새 로그인 수단을 바로 보도록 기다렸다가 넘어간다
  await queryClient.fetchQuery({ queryKey: meKey, queryFn: authApi.me, staleTime: 0 }).catch(() => undefined)
  await queryClient.invalidateQueries({ queryKey: ['chat'] })
}

export async function logout() {
  try {
    await authApi.logout()
  } finally {
    // 로그아웃하면 이 기기에서는 새 게스트로 시작한다
    attachSession(null)
    stopBackgroundStreams()
    liftRestriction()
    queryClient.removeQueries({ queryKey: ['chat'] })
    queryClient.setQueryData(meKey, GUEST)
    await queryClient.invalidateQueries({ queryKey: meKey })
  }
}
