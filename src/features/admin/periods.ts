import { daysAgoIso } from '../../lib/date'

export type Period = '7' | '30' | 'all'
export const PERIODS = [
  ['7', '최근 7일'],
  ['30', '최근 30일'],
  ['all', '전체'],
] as const
export const periodFrom = (p: Period) => (p === 'all' ? undefined : daysAgoIso(Number(p)))
