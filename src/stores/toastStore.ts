import { create } from 'zustand'

interface ToastState {
  message: string | null
  id: number
}

export const useToastStore = create<ToastState>(() => ({ message: null, id: 0 }))

let timer: number | undefined

/** 화면 아래에 잠깐 뜨는 안내 문구 */
export function showToast(message: string, ms = 2200) {
  const id = useToastStore.getState().id + 1
  useToastStore.setState({ message, id })
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    if (useToastStore.getState().id === id) useToastStore.setState({ message: null })
  }, ms)
}
