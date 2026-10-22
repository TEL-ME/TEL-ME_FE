import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { chatApi } from '../../api/chat'
import { queryClient } from '../../lib/queryClient'
import type { GuestLimitStatus } from '../../api/types'

/** 게스트 하루 질문 수 초과 (백엔드 TELME-213, CHAT429-0) */
export const GUEST_DAILY_LIMIT_CODE = 'CHAT429-0'
/** 거절된 질문 자리에 보여 줄 안내 */
export const GUEST_LIMIT_MESSAGE =
  '비회원은 하루에 물어볼 수 있는 질문 수가 정해져 있어요. 로그인하면 지금 대화를 그대로 이어서 물어볼 수 있어요.'
/** 로그인 시트 위쪽 문구 */
export const GUEST_LIMIT_LOGIN_NOTE = '로그인하면 게스트로 나눈 대화를 그대로 이어서 질문할 수 있어요'
/** 남은 질문이 이만큼 이하면 입력창 위에 남은 수와 로그인 안내를 띄운다 */
export const LOW_REMAINING = 3

const DAY_MS = 24 * 60 * 60_000
const KST_OFFSET_MS = 9 * 60 * 60_000

/** 다음 한국 시간 0시 (서버가 한국 시간 날짜로 센다). 서버가 resetsAt을 주지 않았을 때만 쓴다 */
export function nextKoreanMidnight(now: number): number {
  return (Math.floor((now + KST_OFFSET_MS) / DAY_MS) + 1) * DAY_MS - KST_OFFSET_MS
}

/**
 * - limitedUntil: 한도가 풀리는 시각(ms). 걸려 있으면 입력창 대신 로그인 안내를 보여 준다.
 *   대화를 옮겨도·새로고침해도 유지하되, 서버 값(/guest-limit)이 남은 수가 있다고 하면 바로 푼다
 * - remaining: 오늘 남은 질문 수. 게스트로 확인됐을 때만 숫자이고, 회원·제한 꺼짐·아직 모름이면 null
 * - resetsAt: 서버가 알려 준 다시 차는 시각(ms)
 * 로그인·로그아웃하면 사용자가 바뀌므로 모두 비우고 서버 값을 다시 받는다
 */
interface GuestLimitState {
  limitedUntil: number | null
  remaining: number | null
  resetsAt: number | null
}

const EMPTY: GuestLimitState = { limitedUntil: null, remaining: null, resetsAt: null }

export const useGuestLimit = create<GuestLimitState>()(
  persist<GuestLimitState, [], [], Pick<GuestLimitState, 'limitedUntil'>>(() => EMPTY, {
    name: 'telme-guest-limit',
    storage: createJSONStorage(() => localStorage),
    // 잠금 시각만 남긴다. 남은 수는 화면에 들어올 때마다 서버에서 받는다
    partialize: (s) => ({ limitedUntil: s.limitedUntil }),
    // 저장해 둔 한도가 이미 풀렸으면 버린다
    merge: (saved, current) => {
      const until = (saved as Partial<GuestLimitState> | undefined)?.limitedUntil
      return until && until > Date.now() ? { ...current, limitedUntil: until } : current
    },
  }),
)

const set = useGuestLimit.setState
const get = useGuestLimit.getState
/** 응답 순서가 뒤바뀌어 오래된 값으로 덮지 않도록 하는 번호 (조회·전송 응답이 올 때마다 올린다) */
let version = 0

/** 다시 차는 시각: 서버가 알려 준 값이 있으면 그것을, 없으면 다음 한국 시간 0시 */
const unlockAt = () => {
  const { resetsAt } = get()
  return resetsAt && resetsAt > Date.now() ? resetsAt : nextKoreanMidnight(Date.now())
}

/** 질문이 한도에 걸려 거절됐다 (429 CHAT429-0) */
export function markGuestLimited() {
  set({ remaining: 0, limitedUntil: unlockAt() })
}

export function liftGuestLimit() {
  set(EMPTY)
}

/** 질문을 보낸 뒤 서버가 알려 준 남은 수 (전송 응답 guestQuestionsRemaining). 0이면 다음 질문 전에 바로 막는다 */
export function applyGuestRemaining(remaining: number | null | undefined) {
  if (remaining == null) return
  // 조회 중이던 값이 늦게 와서 이 값을 덮지 않게 한다
  version += 1
  set({ remaining, limitedUntil: remaining <= 0 ? unlockAt() : null })
}

/** 서버 상태를 화면에 맞춘다. 서버 값이 우선이라 남은 수가 있으면 저장된 잠금도 푼다 */
export function applyGuestStatus(status: GuestLimitStatus) {
  if (!status.limited || status.remaining == null) {
    set(EMPTY)
    return
  }
  const resetsAt = status.resetsAt ? Date.parse(status.resetsAt) : NaN
  set({ resetsAt: Number.isFinite(resetsAt) ? resetsAt : null })
  set({ remaining: status.remaining, limitedUntil: status.remaining <= 0 ? unlockAt() : null })
}

/**
 * 서버에서 남은 수를 다시 받는다. 게스트일 때만 부른다 (쿠키가 없으면 서버가 새 게스트를 만든다).
 * 실패해도 화면은 그대로 둔다 (질문을 보내면 서버가 다시 판단한다)
 */
export async function refreshGuestLimit() {
  const mine = ++version
  try {
    const status = await chatApi.getGuestLimit()
    if (mine === version) applyGuestStatus(status)
  } catch {
    // 조회 실패는 무시
  }
}

/**
 * 지금 질문을 보내면 한도에 걸리는지 (화면 밖 경로용: 다른 화면에서 넘겨받은 질문 등).
 * 회원이면 저장된 잠금이 남아 있어도 막지 않는다 (useAuth의 meKey와 같은 키)
 */
export function isGuestLocked(): boolean {
  const me = queryClient.getQueryData<{ authenticated?: boolean }>(['auth', 'me'])
  if (me?.authenticated) return false
  const until = get().limitedUntil
  return until != null && until > Date.now()
}

/** 지금 게스트 한도에 걸려 있는지. 화면을 켜 둔 채 0시가 지나면 스스로 풀고 서버 값을 다시 받는다 */
export function useGuestLimited(): boolean {
  const until = useGuestLimit((s) => s.limitedUntil)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!until) return
    const t = window.setTimeout(() => {
      setNow(Date.now())
      set({ limitedUntil: null, remaining: null })
      void refreshGuestLimit()
    }, Math.max(0, until - Date.now()))
    return () => window.clearTimeout(t)
  }, [until])
  return until != null && now < until
}
