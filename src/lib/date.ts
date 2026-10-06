/** 대화 목록용 날짜: 오늘 · 어제 · M월 D일 (올해가 아니면 YYYY. M. D.) */
export function formatListDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000)
  if (days === 0) return '오늘'
  if (days === 1) return '어제'
  if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}월 ${d.getDate()}일`
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`
}

/** 관리자 표용: 오늘 14:20 · 어제 19:42 · 09.30 17:45 */
export function formatAdminTime(iso: string): string {
  const d = new Date(iso)
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const day = formatListDate(iso)
  if (day === '오늘' || day === '어제') return `${day} ${hm}`
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${hm}`
}

/** 최근 N일의 시작 시각 (관리자 기간 필터) */
export function daysAgoIso(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - (days - 1))
  return d.toISOString()
}
