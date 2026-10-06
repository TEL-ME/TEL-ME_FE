import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

interface FitToHeightProps {
  children: ReactNode
  /** 이보다 작게는 줄이지 않는다. 그래도 모자라면 스크롤된다 */
  minScale?: number
  className?: string
}

/**
 * 내용을 시안 크기 그대로 그린 뒤, 남은 높이에 다 들어가도록 비율을 유지한 채 통째로 줄인다.
 * 글자·그림·간격이 모두 같은 비율로 작아진다 (커지지는 않는다).
 */
export default function FitToHeight({ children, minScale = 0.6, className = '' }: FitToHeightProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [naturalHeight, setNaturalHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return
    const measure = () => {
      // transform은 레이아웃 크기에 영향을 주지 않아서 offsetHeight가 원래 높이다
      const natural = inner.offsetHeight
      const available = outer.clientHeight
      if (!natural || !available) return
      setNaturalHeight(natural)
      setScale(Math.max(minScale, Math.min(1, available / natural)))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(outer)
    observer.observe(inner)
    return () => observer.disconnect()
  }, [minScale])

  return (
    <div ref={outerRef} className={`relative min-h-0 flex-1 ${className}`}>
      {/* 내용은 떠 있고(absolute), 이 빈 칸이 줄어든 높이만큼 자리를 잡는다.
          최소 비율에서도 넘치면 이 칸이 화면보다 길어져 스크롤된다 */}
      <div aria-hidden style={{ height: naturalHeight ? naturalHeight * scale : 0 }} />
      <div
        ref={innerRef}
        className="absolute inset-x-0 top-0"
        style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
      >
        {children}
      </div>
    </div>
  )
}
