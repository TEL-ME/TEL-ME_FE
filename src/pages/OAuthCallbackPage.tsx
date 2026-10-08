import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LINK_FAIL_DEFAULT, LINK_FAIL_MESSAGE, takeKakaoLink } from '../features/auth/accountLink'
import { openLoginSheet, takeLoginReturn } from '../features/auth/loginSheetStore'
import { afterLogin } from '../features/auth/useAuth'
import { showToast } from '../stores/toastStore'

/** 백엔드가 카카오 로그인 후 보내는 곳: /oauth/callback?success=true|false&reason=... */
const REASON_MESSAGE: Record<string, string> = {
  'MEMBER409-1': '이미 같은 이메일로 가입한 계정이 있어요. 이메일로 로그인한 뒤 설정에서 카카오를 연결해 주세요.',
  'MEMBER409-2': '이미 다른 소셜 계정이 연결되어 있어요.',
  'MEMBER403-0': '이용이 제한된 계정이에요.',
  'MEMBER403-1': '탈퇴한 계정이에요.',
}
const DEFAULT_FAIL = '카카오 로그인이 완료되지 않았어요. 다시 시도해 주세요.'

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
    // 설정 › 카카오 연결하기에서 다녀온 경우
    if (takeKakaoLink()) {
      if (success) {
        void afterLogin().then(() => {
          showToast('카카오를 연결했어요. 이제 카카오로도 로그인할 수 있어요')
          navigate(to, { replace: true })
        })
      } else {
        navigate(to, { replace: true })
        showToast(LINK_FAIL_MESSAGE[reason] ?? LINK_FAIL_DEFAULT)
      }
      return
    }
    if (success) {
      void afterLogin().then(() => {
        showToast('카카오로 로그인했어요')
        navigate(to, { replace: true })
      })
    } else {
      // 실패했는데 상담 홈 전환 화면을 보여 줄 필요는 없다
      navigate(to === '/intro' ? '/' : to, { replace: true })
      openLoginSheet({ error: REASON_MESSAGE[reason] ?? DEFAULT_FAIL })
    }
  }, [params, navigate])

  return (
    <main className="flex h-full items-center justify-center bg-bg text-sm text-ink-sub" aria-busy="true">
      로그인 확인 중…
    </main>
  )
}
