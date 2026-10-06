import { useCallback, useState } from 'react'
import type { MudoStatus } from './mudo'

/**
 * 무러바라 상태 전환 규칙
 *   idle      → send()    → thinking
 *   thinking  → succeed() → completed
 *   completed → settle()  → idle      (CharacterStage의 onCompletedEnd에 연결)
 *   thinking  → fail()    → failed
 *   failed    → send()    → thinking  (재시도)
 */
export function useMudoStatus(initial: MudoStatus = 'idle') {
  const [status, setStatus] = useState<MudoStatus>(initial)

  const send = useCallback(() => setStatus((s) => (s === 'thinking' ? s : 'thinking')), [])
  const succeed = useCallback(() => setStatus((s) => (s === 'thinking' ? 'completed' : s)), [])
  const fail = useCallback(() => setStatus((s) => (s === 'thinking' ? 'failed' : s)), [])
  const settle = useCallback(() => setStatus((s) => (s === 'completed' ? 'idle' : s)), [])
  const reset = useCallback(() => setStatus('idle'), [])

  return { status, setStatus, send, succeed, fail, settle, reset }
}
