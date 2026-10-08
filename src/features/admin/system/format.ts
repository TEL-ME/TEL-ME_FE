/** 밀리초를 읽기 쉽게: 850ms · 1.2초 · 1분 5초 */
export function formatMs(ms: number | null | undefined): string {
  if (ms == null) return '–'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}초`
  const m = Math.floor(ms / 60_000)
  const s = Math.round((ms % 60_000) / 1000)
  return s ? `${m}분 ${s}초` : `${m}분`
}
