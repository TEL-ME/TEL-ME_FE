import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { InputGuardAction, InputGuardNotice } from '../../api/types'

/**
 * 입력 검사 안내 (TELME-119)
 * - notice: 입력창 위에 보여 줄 안내 (경고·재입력·제한). 다음 질문을 보내면 지운다
 * - restrictedUntil: 일시 제한이 풀리는 시각(ms). 대화를 옮겨도·새로고침해도 유지된다
 *   (제한 중인 안내만 localStorage에 남기고, 경고·재입력 안내는 새로고침하면 사라진다)
 */
interface InputGuardState {
  notice: { action: InputGuardAction; message: string } | null
  restrictedUntil: number | null
}

export const useInputGuard = create<InputGuardState>()(
  persist<InputGuardState>(() => ({ notice: null, restrictedUntil: null }), {
    name: 'telme-input-guard',
    storage: createJSONStorage(() => localStorage),
    partialize: (s): InputGuardState =>
      s.restrictedUntil && s.restrictedUntil > Date.now()
        ? { restrictedUntil: s.restrictedUntil, notice: s.notice?.action === 'RESTRICTED' ? s.notice : null }
        : { restrictedUntil: null, notice: null },
    // 저장해 둔 제한이 이미 끝났으면 버린다
    merge: (saved, current) => {
      const s = saved as Partial<InputGuardState> | undefined
      return s?.restrictedUntil && s.restrictedUntil > Date.now()
        ? { ...current, restrictedUntil: s.restrictedUntil, notice: s.notice ?? null }
        : current
    },
  }),
)

export function applyInputGuard(guard: InputGuardNotice) {
  if (guard.action === 'MASKED') return // 정상 접수라 입력창 안내 대신 토스트로만 알린다
  const until =
    guard.action === 'RESTRICTED'
      ? (guard.restrictionUntil ? Date.parse(guard.restrictionUntil) : NaN) ||
        Date.now() + Math.max(0, guard.retryAfterSeconds) * 1000
      : useInputGuard.getState().restrictedUntil
  useInputGuard.setState({ notice: { action: guard.action, message: guard.message }, restrictedUntil: until })
}

export function clearInputGuardNotice() {
  if (useInputGuard.getState().notice) useInputGuard.setState({ notice: null })
}

/** 제한 시간이 지나면 부른다 */
export function liftRestriction() {
  useInputGuard.setState({ restrictedUntil: null, notice: null })
}
