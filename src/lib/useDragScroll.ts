import { useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'

/** 이만큼(px) 움직여야 끌기로 본다. 그보다 적게 움직이면 평소처럼 클릭이다 */
const DRAG_THRESHOLD = 5

/**
 * 가로로 넘기는 칩 줄을 PC 마우스로도 끌어서 넘기게 한다.
 * 터치·펜은 브라우저 기본 스크롤을 그대로 쓰고, 마우스 왼쪽 버튼만 다룬다.
 * 끌고 난 직후의 클릭은 막아 칩이 눌리지 않게 한다.
 *
 * 사용: const drag = useDragScroll<HTMLDivElement>() → <div {...drag} className="overflow-x-auto">
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const suppressClick = useRef(false)

  const onPointerDown = (e: ReactPointerEvent<T>) => {
    const el = ref.current
    if (!el || e.pointerType !== 'mouse' || e.button !== 0) return
    suppressClick.current = false
    const startX = e.clientX
    const startLeft = el.scrollLeft
    let moved = false

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      if (!moved && Math.abs(dx) < DRAG_THRESHOLD) return
      moved = true
      el.scrollLeft = startLeft - dx
    }
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      if (!moved) return
      // 끈 뒤 손을 뗀 자리의 클릭만 막는다. 칩 밖에서 떼어 클릭이 오지 않아도 다음 클릭은 막지 않게 바로 푼다
      suppressClick.current = true
      setTimeout(() => {
        suppressClick.current = false
      }, 0)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  const onClickCapture = (e: ReactMouseEvent<T>) => {
    if (!suppressClick.current) return
    suppressClick.current = false
    e.preventDefault()
    e.stopPropagation()
  }

  // 버튼 글자를 끌 때 브라우저의 이미지·글자 끌기가 시작되지 않게 한다
  const onDragStart = (e: ReactMouseEvent<T>) => e.preventDefault()

  return { ref, onPointerDown, onClickCapture, onDragStart }
}
