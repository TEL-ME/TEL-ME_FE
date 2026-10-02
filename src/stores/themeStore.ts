import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeSetting = 'system' | 'light' | 'dark'

interface ThemeState {
  theme: ThemeSetting
  setTheme: (theme: ThemeSetting) => void
}

/** index.html의 깜빡임 방지 스크립트와 같은 저장 키를 쓴다 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'telme-theme' },
  ),
)

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

export function resolveDark(theme: ThemeSetting): boolean {
  return theme === 'dark' || (theme === 'system' && darkQuery().matches)
}

/** <html class="dark">를 현재 설정과 시스템 테마에 맞춘다. 앱 시작 시 한 번 호출 */
export function bindThemeToDocument(): () => void {
  const apply = () => {
    document.documentElement.classList.toggle('dark', resolveDark(useThemeStore.getState().theme))
  }
  apply()
  const unsubscribe = useThemeStore.subscribe(apply)
  const mq = darkQuery()
  mq.addEventListener('change', apply)
  return () => {
    unsubscribe()
    mq.removeEventListener('change', apply)
  }
}
