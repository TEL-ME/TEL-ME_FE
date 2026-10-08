import { useEffect, useState } from 'react'
import { liftRestriction, useInputGuard } from './inputGuardStore'

const remainText = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(s / 60)
  return m ? `${m}분 ${s % 60}초` : `${s}초`
}

/** 일시 제한 중이면 남은 시간 문구 (1초마다 갱신), 풀리면 null */
export function useRestrictionText(): string | null {
  const until = useInputGuard((s) => s.restrictedUntil)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!until) return
    const t = window.setInterval(() => {
      const n = Date.now()
      setNow(n)
      if (n >= until) liftRestriction()
    }, 1000)
    return () => window.clearInterval(t)
  }, [until])
  if (!until || now >= until) return null
  return `${remainText(until - now)} 뒤에 다시 보낼 수 있어요`
}
