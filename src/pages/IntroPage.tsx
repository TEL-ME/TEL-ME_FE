import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import IntroTransition from '../features/onboarding/IntroTransition'
import { showToast, useToastStore } from '../stores/toastStore'

const INTRO_MS = 2800

/**
 * 시작하기·로그인을 마치고 상담 홈으로 넘어가는 화면 (/intro).
 * 띄울 안내 문구는 state.toast로 받거나, 직전에 뜬 토스트를 잠깐 맡아 뒀다가 홈에서 보여 준다.
 */
export default function IntroPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useRef<string | null>(
    (location.state as { toast?: string } | null)?.toast ?? useToastStore.getState().message,
  )
  const done = useRef(false)

  const goHome = () => {
    if (done.current) return
    done.current = true
    navigate('/', { replace: true })
    if (toast.current) showToast(toast.current)
  }

  useEffect(() => {
    // 맡아 둔 토스트는 이 화면 위에서는 숨긴다
    useToastStore.setState({ message: null })
    const timer = window.setTimeout(goHome, INTRO_MS)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <IntroTransition onSkip={goHome} />
}
