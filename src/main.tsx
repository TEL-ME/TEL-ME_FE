import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './index.css'
import App from './App.tsx'
import { bindThemeToDocument } from './stores/themeStore'

async function enableMocks() {
  // 개발 모드에서만, 백엔드에 아직 없는 API를 가짜로 응답한다 (src/mocks/handlers.ts)
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_MSW === 'false') return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
}

bindThemeToDocument()

void enableMocks().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
