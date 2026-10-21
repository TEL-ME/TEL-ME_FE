import * as Sentry from '@sentry/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './index.css'
import App from './App.tsx'
import { ErrorScreen } from './app/ErrorScreen'
import { router } from './app/router'
import { syncAnalytics } from './lib/analytics'
import { initSentry } from './lib/sentry'
import { bindThemeToDocument } from './stores/themeStore'

async function enableMocks() {
  // 개발 모드에서만, 백엔드에 아직 없는 API를 가짜로 응답한다 (src/mocks/handlers.ts)
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_MSW === 'false') return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
}

// 가장 먼저 켜야 첫 화면 오류도 잡힌다 (VITE_SENTRY_DSN이 없으면 꺼진 채로 둔다)
initSentry()
// 온보딩을 마친 기기에서, 관리자 화면이 아닐 때만 수집한다 (화면이 바뀔 때마다 확인)
syncAnalytics(window.location.pathname + window.location.search)
let lastLocationKey = router.state.location.key
router.subscribe(({ location }) => {
  if (location.key === lastLocationKey) return
  lastLocationKey = location.key
  syncAnalytics(location.pathname + location.search)
})
bindThemeToDocument()

void enableMocks().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {/* 라우터 밖(공통 Provider 등)에서 난 오류용. 라우터 안 오류는 router의 errorElement가 잡는다 */}
      <Sentry.ErrorBoundary fallback={<ErrorScreen />}>
        <App />
      </Sentry.ErrorBoundary>
    </StrictMode>,
  )
})
