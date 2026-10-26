import { useEffect, useRef, useState } from 'react'

/**
 * 답변을 몇 글자씩 늘려 보여 준다. 실제 토큰 스트리밍이 생기기 전까지의 흉내 (나중에 교체 예정)
 * 긴 답변도 2초 안팎에 끝나도록 한 번에 늘리는 글자 수를 길이에 맞춘다.
 */
export function useTypewriter(text: string, active: boolean, onDone: () => void): string {
  const [shown, setShown] = useState(active ? 0 : text.length)
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    if (!active) return
    const step = Math.max(2, Math.ceil(text.length / 90))
    let n = 0
    const timer = window.setInterval(() => {
      n = Math.min(text.length, n + step)
      setShown(n)
      if (n >= text.length) {
        window.clearInterval(timer)
        onDoneRef.current()
      }
    }, 22)
    return () => window.clearInterval(timer)
  }, [active, text])

  return active ? text.slice(0, shown) : text
}
