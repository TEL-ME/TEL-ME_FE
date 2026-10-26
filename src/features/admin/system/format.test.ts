import { describe, expect, it } from 'vitest'
import type { SearchScoreGrayZone } from '../../../api/admin'
import { isKeyDetail, judgeOutcomeTotals, scoreZone, splitLlmError } from './format'

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

describe('judgeOutcomeTotals', () => {
  const zone: SearchScoreGrayZone = {
    enabled: true,
    qaPass: 0.8,
    qaFloor: 0.69,
    questionPass: 0.9,
    questionFloor: 0.8,
    recorded: 21,
    passedDirectly: 10,
    passedByJudge: 4,
    passedOnJudgeFailure: 1,
    rejectedByJudge: 3,
    droppedOnJudgeFailure: 2,
    belowFloor: 1,
    refinedFinalPassed: 2,
  }

  it('근거 찾음은 통과 세 칸, 못 찾음은 나머지 세 칸이고 둘을 합하면 recorded다', () => {
    const totals = judgeOutcomeTotals(zone)
    expect(totals.found).toBe(15)
    expect(totals.notFound).toBe(6)
    expect(totals.found + totals.notFound).toBe(zone.recorded)
  })

  it('최종으로 못 찾은 수는 첫 검색에서 못 찾은 수에서 정제 질문으로 찾은 수를 뺀다', () => {
    expect(judgeOutcomeTotals(zone).finalNotFound).toBe(4)
    expect(judgeOutcomeTotals({ ...zone, refinedFinalPassed: 10 }).finalNotFound).toBe(0)
  })

  it('판정 실패는 점수로 남긴 것과 버린 것을 합친다', () => {
    expect(judgeOutcomeTotals(zone).judgeFailed).toBe(3)
  })
})

describe('scoreZone', () => {
  it('칸의 가운데 점수로 버림·판정·바로 통과를 정한다', () => {
    expect(scoreZone(0.6, 0.65, 0.69, 0.8)).toBe('drop')
    expect(scoreZone(0.7, 0.75, 0.69, 0.8)).toBe('judge')
    expect(scoreZone(0.75, 0.8, 0.69, 0.8)).toBe('judge')
    expect(scoreZone(0.8, 0.85, 0.69, 0.8)).toBe('pass')
  })

  it('경계가 칸 안에 걸리면 칸의 대부분이 속한 쪽이다', () => {
    // 0.65~0.70 칸: 0.69~0.70만 판정 구간이라 대부분(0.65~0.69)이 버림
    expect(scoreZone(0.65, 0.7, 0.69, 0.8)).toBe('drop')
    // 경계가 0.66이면 대부분(0.66~0.70)이 판정 구간
    expect(scoreZone(0.65, 0.7, 0.66, 0.8)).toBe('judge')
  })
})
