import { describe, expect, it } from 'vitest'
import { HIDDEN_TASKS, VISIBLE_TASKS } from './admin'

describe('운영 상태에 보이는 LLM 작업', () => {
  it('되묻기·문맥 연결·추천 질문은 응답 속도·오류 목록에서 뺀다', () => {
    for (const t of ['CLARIFICATION', 'CONTEXT_RESOLUTION', 'FOLLOW_UP']) expect(HIDDEN_TASKS.has(t)).toBe(true)
    expect(VISIBLE_TASKS.map(([k]) => k)).not.toContain('CLARIFICATION')
    expect(VISIBLE_TASKS.map(([k]) => k)).toContain('RAG_ANSWER')
  })
})
