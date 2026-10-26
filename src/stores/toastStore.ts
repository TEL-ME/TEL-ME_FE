import { create } from 'zustand'

export interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastState {
  message: string | null
  action: ToastAction | null
  id: number
}

export const useToastStore = create<ToastState>(() => ({ message: null, action: null, id: 0 }))

let timer: number | undefined

/** 화면 아래에 잠깐 뜨는 안내 문구. action을 주면 오른쪽에 버튼이 붙는다 */
export function showToast(message: string, ms = 2200, action?: ToastAction) {
  const id = useToastStore.getState().id + 1
  useToastStore.setState({ message, action: action ?? null, id })
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    if (useToastStore.getState().id === id) useToastStore.setState({ message: null, action: null })
  }, ms)
}

export function hideToast() {
  window.clearTimeout(timer)
  useToastStore.setState({ message: null, action: null })
}
