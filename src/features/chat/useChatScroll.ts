import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 채팅 스크롤
 * - 맨 아래를 보고 있으면 새 내용(타자 효과 포함)이 생길 때 따라 내려간다
 * - 위로 올리면 무러바라를 숨기고, 다시 내려오면 보인다
 * - 이전 메시지를 앞에 붙일 때는 보던 자리를 그대로 지킨다 (holdPosition → restorePosition)
 */
export function useChatScroll() {
  const elRef = useRef<HTMLElement | null>(null)
  const [mounted, setMounted] = useState<HTMLElement | null>(null)
  const [mascotHidden, setMascotHidden] = useState(false)
  const stick = useRef(true)
  const lastTop = useRef(0)
  /** 앞에 내용을 붙이기 전, 맨 아래로부터의 거리 */
  const anchor = useRef<number | null>(null)

  const scrollRef = useCallback((el: HTMLElement | null) => {
    elRef.current = el
    setMounted(el)
  }, [])

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    const onScroll = () => {
      const top = el.scrollTop
      const nearBottom = el.scrollHeight - top - el.clientHeight < 48
      const delta = top - lastTop.current
      lastTop.current = top
      // 따라 내려가기는 사용자가 직접 위로 올렸을 때만 끈다.
      // (내용이 자라는 중에 늦게 도착한 스크롤 이벤트를 보고 끄면, 답변이 아래에서 잘린 채 멈춘다)
      if (nearBottom) stick.current = true
      else if (delta < -4) stick.current = false
      if (nearBottom || delta > 4) setMascotHidden(false)
      else if (delta < -4) setMascotHidden(true)
    }
    el.addEventListener('scroll', onScroll, { passive: true })

    const observer = new ResizeObserver(() => {
      if (!stick.current) return
      el.scrollTop = el.scrollHeight
      lastTop.current = el.scrollTop
    })
    if (el.firstElementChild) observer.observe(el.firstElementChild)

    return () => {
      el.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [mounted])

  /** 질문을 보낼 때는 무조건 맨 아래로 */
  const toBottom = useCallback(() => {
    stick.current = true
    setMascotHidden(false)
    const el = elRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    lastTop.current = el.scrollTop
    // 보낸 질문·생각 중 말풍선이 그려진 다음 한 번 더 맨 아래로
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
      lastTop.current = el.scrollTop
    })
  }, [])

  /** 위에 내용이 붙기 직전에 부른다 */
  const holdPosition = useCallback(() => {
    const el = elRef.current
    if (!el) return
    stick.current = false
    anchor.current = el.scrollHeight - el.scrollTop
  }, [])

  /** 붙은 뒤(레이아웃 직후)에 부른다. 붙잡아 둔 자리가 없으면 아무것도 안 한다 */
  const restorePosition = useCallback(() => {
    const el = elRef.current
    if (!el || anchor.current == null) return
    el.scrollTop = el.scrollHeight - anchor.current
    lastTop.current = el.scrollTop
    anchor.current = null
  }, [])

  return { scrollRef, mascotHidden, toBottom, holdPosition, restorePosition }
}
