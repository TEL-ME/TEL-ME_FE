import { create } from 'zustand'
import { speechApi } from '../../api/speech'
import { showToast } from '../../stores/toastStore'
import { speechErrorMessage } from './speechMessages'

/** 답변 듣기: 한 번에 하나만 재생한다 */
export interface SpeechPlayerState {
  messageId: number | null
  status: 'idle' | 'loading' | 'playing'
}

export const useSpeechPlayer = create<SpeechPlayerState>(() => ({ messageId: null, status: 'idle' }))

/** 한 번 받은 음성은 다시 받지 않는다 (메시지 ID → blob 주소) */
const cache = new Map<number, string>()
let audio: HTMLAudioElement | null = null
let pending: AbortController | null = null

export function stopSpeech() {
  pending?.abort()
  pending = null
  if (audio) {
    audio.pause()
    audio.onended = null
    audio.onerror = null
    audio = null
  }
  useSpeechPlayer.setState({ messageId: null, status: 'idle' })
}

/** 그 답변이 재생(또는 불러오는) 중이면 멈추고, 아니면 앞의 것을 멈추고 재생한다 */
export async function toggleSpeech(messageId: number) {
  const current = useSpeechPlayer.getState()
  if (current.messageId === messageId && current.status !== 'idle') {
    stopSpeech()
    return
  }
  stopSpeech()
  useSpeechPlayer.setState({ messageId, status: 'loading' })

  let url = cache.get(messageId)
  if (!url) {
    const controller = new AbortController()
    pending = controller
    try {
      const blob = await speechApi.messageSpeech(messageId, controller.signal)
      url = URL.createObjectURL(blob)
      cache.set(messageId, url)
    } catch (e) {
      if (controller.signal.aborted) return
      useSpeechPlayer.setState({ messageId: null, status: 'idle' })
      showToast(speechErrorMessage(e))
      return
    } finally {
      if (pending === controller) pending = null
    }
    // 받는 사이 다른 답변을 눌렀거나 멈췄다
    if (useSpeechPlayer.getState().messageId !== messageId) return
  }

  const el = new Audio(url)
  audio = el
  const done = () => {
    if (audio === el) stopSpeech()
  }
  el.onended = done
  el.onerror = () => {
    done()
    showToast('음성을 재생하지 못했어요')
  }
  try {
    await el.play()
    if (audio === el) useSpeechPlayer.setState({ messageId, status: 'playing' })
  } catch {
    // 브라우저가 자동 재생을 막은 경우 등
    const mine = audio === el
    done()
    if (mine) showToast('음성을 재생하지 못했어요')
  }
}
