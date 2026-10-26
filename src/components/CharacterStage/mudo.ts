import completedSrc from '../../assets/mudo/mudo-completed.png'
import idleSrc from '../../assets/mudo/mudo-idle.png'
import thinkingSrc from '../../assets/mudo/mudo-thinking.png'

/** 무러바라 상태. failed는 thinking 포즈를 멈춘 채로 보여 준다. */
export type MudoStatus = 'idle' | 'thinking' | 'completed' | 'failed'

export type MudoPose = 'idle' | 'thinking' | 'completed'

/**
 * 세 PNG는 같은 480×480 투명 캔버스에 바닥선·머리 중심을 맞춰 저장돼 있다.
 * 그래서 같은 크기의 컨테이너에 겹쳐 놓기만 해도 포즈가 바뀔 때 위치가 흔들리지 않는다.
 */
export const MUDO_POSES: readonly { pose: MudoPose; src: string }[] = [
  { pose: 'idle', src: idleSrc },
  { pose: 'thinking', src: thinkingSrc },
  { pose: 'completed', src: completedSrc },
]

export const POSE_BY_STATUS: Record<MudoStatus, MudoPose> = {
  idle: 'idle',
  thinking: 'thinking',
  completed: 'completed',
  failed: 'thinking',
}

export const MUDO_CAPTION: Record<MudoStatus, string> = {
  idle: '질문을 기다리고 있어요',
  thinking: '답변을 생각하고 있어요…',
  completed: '답변이 도착했어요!',
  failed: '답변을 받지 못했어요',
}

/** completed 상태를 유지하는 시간. 이후 onCompletedEnd가 호출된다. */
export const COMPLETED_HOLD_MS = 1500

let preloadPromise: Promise<void> | null = null

/**
 * 세 포즈를 미리 내려받고 디코드한다. 앱 시작 시 한 번 불러 두면
 * 처음 상태가 바뀔 때도 이미지가 늦게 떠서 번쩍이는 일이 없다.
 */
export function preloadMudoPoses(): Promise<void> {
  if (preloadPromise) return preloadPromise
  preloadPromise = Promise.all(
    MUDO_POSES.map(({ src }) => {
      const img = new Image()
      img.decoding = 'async'
      img.src = src
      return img.decode().catch(() => undefined)
    }),
  ).then(() => undefined)
  return preloadPromise
}
