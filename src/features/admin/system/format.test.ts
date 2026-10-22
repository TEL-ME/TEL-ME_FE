import { describe, expect, it } from 'vitest'
import { isKeyDetail, splitLlmError } from './format'

describe('splitLlmError', () => {
  it('코드·문구·괄호 속 실패 원인을 나눈다', () => {
    expect(splitLlmError('LLM502-1 LLM 응답 형식이 올바르지 않습니다. (stopReason=max_tokens, outputTokens=1024)')).toEqual({
      code: 'LLM502-1',
      text: 'LLM 응답 형식이 올바르지 않습니다.',
      details: ['stopReason=max_tokens', 'outputTokens=1024'],
    })
    expect(splitLlmError('LLM504-1 LLM 응답 시간이 초과되었습니다. (ApiCallTimeoutException)').details).toEqual(['ApiCallTimeoutException'])
  })

  it('원인이 없거나 형식이 다르면 문구를 그대로 둔다', () => {
    expect(splitLlmError('LLM500-1 모델 오류')).toEqual({ code: 'LLM500-1', text: '모델 오류', details: [] })
    expect(splitLlmError('Read timed out')).toEqual({ code: null, text: 'Read timed out', details: [] })
    expect(splitLlmError(null)).toEqual({ code: null, text: '', details: [] })
  })

  it('종료 사유와 HTTP 상태를 눈여겨볼 원인으로 고른다', () => {
    expect(isKeyDetail('stopReason=max_tokens')).toBe(true)
    expect(isKeyDetail('status=429')).toBe(true)
    expect(isKeyDetail('outputTokens=1024')).toBe(false)
  })
})
