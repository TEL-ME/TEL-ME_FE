import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LINK_ONLY_REASONS, linkFailure, takeLinkingProvider } from '../features/auth/accountLink'
import { openLoginSheet, setLoginReturn, takeLoginReturn } from '../features/auth/loginSheetStore'
import { PROVIDER_NAME, takeOauthProvider } from '../features/auth/socialProviders'
import { afterLogin } from '../features/auth/useAuth'
import { showToast } from '../stores/toastStore'

/** 일반 소셜 로그인 실패 이유 (MEMBER409-1은 따로 선택 화면으로 보낸다) */
const REASON_MESSAGE: Record<string, string> = {
  'MEMBER409-2': '이미 다른 소셜 계정이 연결되어 있어요.',
  'MEMBER403-0': '이용이 제한된 계정이에요.',
  'MEMBER403-1': '탈퇴한 계정이에요.',
}

/**
 * 백엔드가 소셜 인증 후 보내는 곳: /oauth/callback?success=true|false&reason=...
 * - 설정에서 연결하기로 다녀왔으면(linkingProvider) 연결 결과를 설정 화면에서 보여준다
 * - 일반 로그인에서 같은 이메일 계정이 있으면(MEMBER409-1) 연결할지 새로 시작할지 고르는 화면으로 간다
 */
export default function OAuthCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true
    const success = params.get('success') === 'true'
    const reason = params.get('reason') ?? ''
    const to = takeLoginReturn()
    // 둘 다 바로 지워 두어 다음 로그인에 남지 않게 한다
    const linking = takeLinkingProvider()
    const oauth = takeOauthProvider()

    // 설정 › 연결하기에서 다녀온 경우
    if (linking !== undefined || (!success && LINK_ONLY_REASONS.includes(reason))) {
      const provider = linking ?? null
      if (success) {
        void afterLogin().then(() => {
          navigate('/settings', { replace: true })
          showToast(provider ? `${PROVIDER_NAME[provider]} 계정을 연결했어요` : '소셜 계정을 연결했어요')
        })
      } else {
        navigate('/settings', { replace: true, state: { linkFailure: linkFailure(provider, reason) } })
      }
      return
    }

    if (success) {
      void afterLogin().then(() => {
        showToast(oauth ? `${PROVIDER_NAME[oauth]}로 로그인했어요` : '로그인했어요')
        navigate(to, { replace: true })
      })
      return
    }

    // 같은 이메일로 가입한 계정이 있다: 연결 · 새 계정 중 고른다. 끝나면 원래 가려던 곳으로
    if (reason === 'MEMBER409-1') {
      setLoginReturn(to)
      navigate('/auth/social-match', { replace: true, state: { provider: oauth } })
      return
    }

    // 실패했는데 상담 홈 전환 화면을 보여 줄 필요는 없다
    navigate(to === '/intro' ? '/' : to, { replace: true })
    const name = oauth ? PROVIDER_NAME[oauth] : '소셜'
    openLoginSheet({ error: REASON_MESSAGE[reason] ?? `${name} 로그인이 완료되지 않았어요. 다시 시도해 주세요.` })
  }, [params, navigate])

  return (
    <main className="flex h-full items-center justify-center bg-bg text-sm text-ink-sub" aria-busy="true">
      로그인 확인 중…
    </main>
  )
}
