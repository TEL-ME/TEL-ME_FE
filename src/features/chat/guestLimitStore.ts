import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** 게스트 하루 질문 수 초과 (백엔드 TELME-213, CHAT429-0) */
export const GUEST_DAILY_LIMIT_CODE = 'CHAT429-0'
/** 거절된 질문 자리에 보여 줄 안내 */
export const GUEST_LIMIT_MESSAGE =
  '비회원은 하루에 물어볼 수 있는 질문 수가 정해져 있어요. 로그인하면 지금 대화를 그대로 이어서 물어볼 수 있어요.'
/** 로그인 시트 위쪽 문구 */
export const GUEST_LIMIT_LOGIN_NOTE = '로그인하면 게스트로 나눈 대화를 그대로 이어서 질문할 수 있어요'

const DAY_MS = 24 * 60 * 60_000
const KST_OFFSET_MS = 9 * 60 * 60_000

/** 다음 한국 시간 0시 (서버가 한국 시간 날짜로 센다) */
export function nextKoreanMidnight(now: number): number {
  return (Math.floor((now + KST_OFFSET_MS) / DAY_MS) + 1) * DAY_MS - KST_OFFSET_MS
}

/**
 * limitedUntil: 게스트 한도가 풀리는 시각(ms).
 * 같은 날 다시 보내도 또 거절되므로 대화를 옮겨도·새로고침해도 유지하고, 입력창 대신 로그인 안내를 보여 준다.
 * 로그인·로그아웃하면 사용자가 바뀌므로 풀고 서버 판단을 따른다
 */
interface GuestLimitState {
  limitedUntil: number | null
}

export const useGuestLimit = create<GuestLimitState>()(
  persist<GuestLimitState>(() => ({ limitedUntil: null }), {
    name: 'telme-guest-limit',
    storage: createJSONStorage(() => localStorage),
    // 저장해 둔 한도가 이미 풀렸으면 버린다
    merge: (saved, current) => {
      const until = (saved as Partial<GuestLimitState> | undefined)?.limitedUntil
      return until && until > Date.now() ? { ...current, limitedUntil: until } : current
    },
  }),
)

export function markGuestLimited() {
  useGuestLimit.setState({ limitedUntil: nextKoreanMidnight(Date.now()) })
}

export function liftGuestLimit() {
  if (useGuestLimit.getState().limitedUntil != null) useGuestLimit.setState({ limitedUntil: null })
}

/** 지금 게스트 한도에 걸려 있는지. 화면을 켜 둔 채 0시가 지나면 스스로 푼다 */
export function useGuestLimited(): boolean {
  const until = useGuestLimit((s) => s.limitedUntil)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!until) return
    const t = window.setTimeout(() => {
      setNow(Date.now())
      liftGuestLimit()
    }, Math.max(0, until - Date.now()))
    return () => window.clearTimeout(t)
  }, [until])
  return until != null && now < until
}
