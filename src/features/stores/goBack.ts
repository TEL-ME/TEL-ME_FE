import type { NavigateFunction } from 'react-router-dom'

/** 앱 안에서 왔으면 뒤로, 주소로 바로 들어왔으면 fallback으로 간다 */
export function goBack(navigate: NavigateFunction, fallback: string) {
  const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
  if (idx > 0) navigate(-1)
  else navigate(fallback, { replace: true })
}
