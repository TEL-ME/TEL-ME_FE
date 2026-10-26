import { useEffect, useRef, type CSSProperties } from 'react'
import './CharacterStage.css'
import {
  COMPLETED_HOLD_MS,
  MUDO_CAPTION,
  MUDO_POSES,
  POSE_BY_STATUS,
  preloadMudoPoses,
  type MudoStatus,
} from './mudo'

export interface CharacterStageProps {
  status: MudoStatus
  /** completed 상태가 completedHoldMs 동안 유지된 뒤 호출. 보통 상태를 idle로 돌린다. */
  onCompletedEnd?: () => void
  completedHoldMs?: number
  /** failed 상태에서 재시도 버튼을 보여 주려면 전달 */
  onRetry?: () => void
  retryLabel?: string
  /** 상태 문구 말풍선을 화면에서 숨긴다. 화면낭독기용 문구는 그대로 읽힌다. */
  hideCaption?: boolean
  className?: string
  /** --mudo-size 등 CSS 변수를 넘겨 위치·크기를 조절 */
  style?: CSSProperties
}

/**
 * 채팅 화면의 무러바라 상태 표시.
 * - 포즈마다 독립된 <img>를 같은 크기의 고정 컨테이너에 겹쳐 두고, 활성 포즈만 보인다.
 * - 나가는 포즈는 즉시 숨기고 들어오는 포즈만 opacity·transform으로 나타나서
 *   두 포즈가 겹쳐 보이거나 이전 포즈가 희미하게 남지 않는다.
 * - 상태 문구가 role="status"로 읽히므로 캐릭터 이미지는 장식(alt="")으로 둔다.
 */
export default function CharacterStage({
  status,
  onCompletedEnd,
  completedHoldMs = COMPLETED_HOLD_MS,
  onRetry,
  retryLabel = '다시 시도',
  hideCaption = false,
  className,
  style,
}: CharacterStageProps) {
  const activePose = POSE_BY_STATUS[status]

  // 최신 콜백을 ref로 들고 있어 부모가 매 렌더 새 함수를 넘겨도 타이머가 다시 걸리지 않는다.
  const onCompletedEndRef = useRef(onCompletedEnd)
  useEffect(() => {
    onCompletedEndRef.current = onCompletedEnd
  }, [onCompletedEnd])

  useEffect(() => {
    void preloadMudoPoses()
  }, [])

  useEffect(() => {
    if (status !== 'completed') return
    const timer = window.setTimeout(() => onCompletedEndRef.current?.(), completedHoldMs)
    return () => window.clearTimeout(timer)
  }, [status, completedHoldMs])

  return (
    <div
      className={['mudo-stage', className].filter(Boolean).join(' ')}
      data-status={status}
      style={style}
    >
      <div className="mudo-stage__figure" aria-hidden="true">
        <div className="mudo-stage__motion">
          {MUDO_POSES.map(({ pose, src }) => (
            <img
              key={pose}
              className={pose === activePose ? 'mudo-pose is-active' : 'mudo-pose'}
              src={src}
              alt=""
              draggable={false}
              decoding="async"
              loading="eager"
            />
          ))}

          {status === 'idle' && (
            <span className="mudo-accent">
              <i />
              <i />
            </span>
          )}

          {status === 'thinking' && (
            <span className="mudo-dots">
              <i />
              <i />
              <i />
            </span>
          )}

          {status === 'completed' && (
            <span className="mudo-check">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
          )}
        </div>
      </div>

      {hideCaption ? (
        <p role="status" aria-live="polite" className="mudo-stage__sr-only">
          {MUDO_CAPTION[status]}
        </p>
      ) : (
        <div className="mudo-stage__caption">
          <p role="status" aria-live="polite" className="mudo-stage__text">
            {MUDO_CAPTION[status]}
          </p>
          {status === 'failed' && onRetry && (
            <button type="button" className="mudo-stage__retry" onClick={onRetry}>
              {retryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
