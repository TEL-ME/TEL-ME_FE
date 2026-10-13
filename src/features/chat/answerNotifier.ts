import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatExecutionState, ChatFailure } from '../../api/types'
import { showToast } from '../../stores/toastStore'

/**
 * 답변 완료 알림
 * - 그 대화를 보고 있으면: 알리지 않는다 (답변이 바로 보인다)
 * - 앱 안의 다른 화면(매장·설정·다른 대화)이면: 토스트 + "보기"
 * - 탭이 뒤에 있으면: 브라우저 알림(설정에서 켰을 때) + 탭 제목에 도착 수 표시
 */
export type AnswerOutcome = 'answered' | 'clarify' | 'failed'

const MESSAGE: Record<AnswerOutcome, string> = {
  answered: '답변이 도착했어요',
  clarify: '답변하려면 조금 더 알려 주세요',
  failed: '답변을 만들지 못했어요',
}

interface AnswerNotifyState {
  /** 탭이 뒤에 있을 때 브라우저 알림을 띄울지 (권한은 켤 때 받는다) */
  browserEnabled: boolean
}

export const useAnswerNotify = create<AnswerNotifyState>()(
  persist<AnswerNotifyState>(() => ({ browserEnabled: false }), { name: 'telme-answer-notify' }),
)

export const browserNotifySupported = () => typeof window !== 'undefined' && 'Notification' in window

/** 설정 토글. 켤 때는 권한을 받고, 받지 못하면 꺼 둔 채로 이유를 알린다 */
export async function setBrowserNotify(on: boolean) {
  if (!on) return useAnswerNotify.setState({ browserEnabled: false })
  if (!browserNotifySupported()) return showToast('이 브라우저는 알림을 지원하지 않아요')
  const permission =
    Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
  if (permission !== 'granted') return showToast('브라우저 설정에서 이 사이트의 알림을 허용해 주세요', 3200)
  useAnswerNotify.setState({ browserEnabled: true })
}

/** 켜져 있고 권한도 있을 때만 켜진 것으로 본다 (권한은 브라우저 설정에서 언제든 바뀐다) */
export const browserNotifyOn = (enabled: boolean) =>
  enabled && browserNotifySupported() && Notification.permission === 'granted'

export function outcomeOfComplete(state: ChatExecutionState): AnswerOutcome {
  if (state.status !== 'COMPLETED') return 'failed'
  return state.outputMessage?.messageType === 'CLARIFICATION' ? 'clarify' : 'answered'
}

/** 같은 실행을 다른 창에서 보고 있다는 안내는 답변 결과가 아니므로 알리지 않는다 */
export const shouldNotifyFailure = (failure: ChatFailure) => failure.errorCode !== 'CONNECTED_ELSEWHERE'

const chatPath = (sessionId: number) => `/chat/${sessionId}`

/** 라우터가 이 모듈을 거쳐 chatRunStore를 불러오므로, 순환 참조를 피해 쓸 때 불러온다 */
const openChat = (sessionId: number) =>
  void import('../../app/router').then(({ router }) => router.navigate(chatPath(sessionId)))

let unread = 0
let baseTitle: string | null = null

function markTitle() {
  if (baseTitle == null) {
    baseTitle = document.title
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || baseTitle == null) return
      unread = 0
      document.title = baseTitle
    })
  }
  unread += 1
  document.title = `(${unread}) ${baseTitle}`
}

export function notifyAnswer(sessionId: number, outcome: AnswerOutcome) {
  const message = MESSAGE[outcome]

  if (document.visibilityState === 'hidden') {
    markTitle()
    if (!browserNotifyOn(useAnswerNotify.getState().browserEnabled)) return
    try {
      // 같은 대화의 알림은 하나만 남긴다
      const n = new Notification('TEL-ME', { body: message, tag: `telme-chat-${sessionId}` })
      n.onclick = () => {
        window.focus()
        openChat(sessionId)
        n.close()
      }
    } catch {
      // 모바일 크롬처럼 페이지에서 바로 띄우는 알림을 막는 브라우저는 탭 제목 표시만 남긴다
    }
    return
  }

  if (window.location.pathname === chatPath(sessionId)) return
  showToast(message, 4000, { label: '보기', onClick: () => openChat(sessionId) })
}
