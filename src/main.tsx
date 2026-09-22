import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

async function renderApp() {
  const isChatTest = window.location.pathname.replace(/\/$/, '') === '/chat-test'
  const { default: Page } = isChatTest
    ? await import('./chat-test/ChatTestPage')
    : await import('./App')
  if (isChatTest) await import('./chat-test/chat-test.css')
  else await import('./index.css')
  createRoot(document.getElementById('root')!).render(<StrictMode><Page /></StrictMode>)
}
void renderApp()
