import { describe, expect, it } from 'vitest'
import { formatListDate } from './date'

describe('formatListDate', () => {
  it('오늘 · 어제 · 날짜로 보여 준다', () => {
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    expect(formatListDate(now.toISOString())).toBe('오늘')
    expect(formatListDate(yesterday.toISOString())).toBe('어제')
    expect(formatListDate('2020-03-05T12:00:00')).toBe('2020. 3. 5.')
  })
})
