import type { SearchScoreGrayZone } from '../../../api/admin'

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

/**
 * 판정 뒤 결과 여섯 칸을 첫 검색 근거 찾음·못 찾음·판정 실패로 묶는다. found + notFound = recorded.
 * finalNotFound는 첫 검색에서 못 찾은 질문 중 정제 질문으로도 못 찾은 수다
 */
export function judgeOutcomeTotals(g: SearchScoreGrayZone) {
  const notFound = g.rejectedByJudge + g.droppedOnJudgeFailure + g.belowFloor
  return {
    found: g.passedDirectly + g.passedByJudge + g.passedOnJudgeFailure,
    notFound,
    finalNotFound: Math.max(0, notFound - g.refinedFinalPassed),
    judgeFailed: g.passedOnJudgeFailure + g.droppedOnJudgeFailure,
  }
}

export type ScoreZone = 'drop' | 'judge' | 'pass'

/**
 * 점수 분포 칸(min 이상 max 미만)이 속한 답변 규칙 구간. 칸별 개수만 있어 경계가 칸 안에 걸리면
 * 칸의 가운데 점수로 정한다(칸의 대부분이 속한 구간). qaPass 이상 바로 통과, qaFloor 이상 판정, 그 아래 버림
 */
export function scoreZone(min: number, max: number, qaFloor: number, qaPass: number): ScoreZone {
  const mid = (min + max) / 2
  if (mid >= qaPass) return 'pass'
  if (mid >= qaFloor) return 'judge'
  return 'drop'
}
