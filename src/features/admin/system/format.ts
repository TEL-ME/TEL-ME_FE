/** 밀리초를 읽기 쉽게: 850ms · 1.2초 · 1분 5초 */
export function formatMs(ms: number | null | undefined): string {
  if (ms == null) return '–'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}초`
  const m = Math.floor(ms / 60_000)
  const s = Math.round((ms % 60_000) / 1000)
  return s ? `${m}분 ${s}초` : `${m}분`
}

export interface LlmErrorParts {
  /** 오류 코드 (예: LLM502-1) */
  code: string | null
  /** 오류 문구 */
  text: string
  /** 백엔드가 괄호로 붙인 실패 원인 (예: stopReason=max_tokens, outputTokens=1024 / status=429, code=ThrottlingException) */
  details: string[]
}

/**
 * LLM 오류 메시지를 코드·문구·실패 원인으로 나눈다 (백엔드 TELME-216).
 * 형식: "LLM502-1 LLM 응답 형식이 올바르지 않습니다. (stopReason=max_tokens, outputTokens=1024)"
 * 원인이 문구 끝에 있어 말줄임에 잘리지 않도록 따로 꺼내 앞에 보여 준다
 */
export function splitLlmError(message: string | null | undefined): LlmErrorParts {
  let text = (message ?? '').trim()
  let details: string[] = []
  const tail = /^(.*\S)\s*\(([^()]+)\)$/s.exec(text)
  if (tail) {
    text = tail[1]
    details = tail[2]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  const head = /^([A-Z]+\d+-\d+)\s+(.*)$/s.exec(text)
  return head ? { code: head[1], text: head[2], details } : { code: null, text, details }
}

/** 실패 원인 중 눈여겨볼 것: 종료 사유(max_tokens 등)·HTTP 상태 */
export const isKeyDetail = (d: string) => /^(stopReason|status)=/.test(d)
