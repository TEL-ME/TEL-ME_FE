import { create } from 'zustand'

interface LoginSheetState {
  open: boolean
  /** 시트 위쪽 안내 문구 (예: 평가는 로그인 후에 남길 수 있어요) */
  subtitle: string | null
  error: string | null
}

export const useLoginSheet = create<LoginSheetState>(() => ({ open: false, subtitle: null, error: null }))

const RETURN_KEY = 'telme-login-return'

/** 로그인 후 돌아올 주소. 카카오처럼 페이지를 떠났다 오는 경우도 있어서 sessionStorage에 둔다 */
export function setLoginReturn(path: string) {
  sessionStorage.setItem(RETURN_KEY, path)
}

export function takeLoginReturn(): string {
  const path = sessionStorage.getItem(RETURN_KEY) || '/'
  sessionStorage.removeItem(RETURN_KEY)
  return path
}

export function openLoginSheet(options: { subtitle?: string; error?: string } = {}) {
  setLoginReturn(window.location.pathname + window.location.search)
  useLoginSheet.setState({ open: true, subtitle: options.subtitle ?? null, error: options.error ?? null })
}

export function closeLoginSheet() {
  useLoginSheet.setState({ open: false, error: null })
}
