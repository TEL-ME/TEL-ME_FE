import { create } from 'zustand'
import { ApiError } from '../../api/client'
import { feedbackApi } from '../../api/feedback'
import type { DislikeReason, MyFeedback, Rating } from '../../api/types'
import { showToast } from '../../stores/toastStore'
import { openLoginSheet } from '../auth/loginSheetStore'
import { findMessage, patchMessage } from '../chat/queries'

export const DISLIKE_REASONS: { code: DislikeReason; label: string }[] = [
  { code: 'WRONG_INFO', label: '정보가 정확하지 않아요' },
  { code: 'NOT_RELATED', label: '질문과 관련이 없어요' },
  { code: 'HARD_TO_READ', label: '이해하기 어려워요' },
]

interface Target {
  sessionId: number
  messageId: number
}

/** 싫어요 이유 선택 시트 */
export const useDislikeSheet = create<{ target: Target | null }>(() => ({ target: null }))
export const openDislikeSheet = (target: Target) => useDislikeSheet.setState({ target })
export const closeDislikeSheet = () => useDislikeSheet.setState({ target: null })

/** 메시지 목록 캐시의 내 평가만 바꾼다 (화면이 바로 바뀌게) */
function patchFeedback({ sessionId, messageId }: Target, myFeedback: MyFeedback | null) {
  patchMessage(sessionId, messageId, (m) => ({ ...m, myFeedback }))
}

/** 화면을 먼저 바꾸고 저장한다. 실패하면 되돌린다. 성공 여부를 돌려준다 */
async function run(
  target: Target,
  next: MyFeedback | null,
  previous: MyFeedback | null,
  request: () => Promise<unknown>,
): Promise<boolean> {
  patchFeedback(target, next)
  try {
    await request()
    return true
  } catch (e) {
    patchFeedback(target, previous)
    if (e instanceof ApiError && e.status === 401) {
      requireLogin(target, next?.rating ?? 'LIKE')
      return false
    }
    showToast(e instanceof ApiError ? e.message : '평가를 저장하지 못했어요')
    return false
  }
}

export function saveLike(target: Target, previous: MyFeedback | null) {
  return run(target, { rating: 'LIKE', reason: null, comment: null }, previous, () =>
    feedbackApi.save(target.messageId, { rating: 'LIKE' }),
  ).then((ok) => ok && showToast('평가를 남겼어요'))
}

/** 이 화면에서 싫어요 의견을 보낸 적 있는 답변 (취소 후 다시 보낼 때 알려 주려고) */
const dislikeSent = new Set<number>()

export function saveDislike(target: Target, previous: MyFeedback | null, reason: DislikeReason, comment: string) {
  const text = comment.trim() || undefined
  // 같은 답변엔 의견이 하나만 남는다 — 다시 보내면 이전 의견을 새 의견으로 바꾼다
  const resent = previous?.rating === 'DISLIKE' || dislikeSent.has(target.messageId)
  const switched = previous?.rating === 'LIKE'
  return run(target, { rating: 'DISLIKE', reason, comment: text ?? null }, previous, () =>
    feedbackApi.save(target.messageId, { rating: 'DISLIKE', reason, comment: text }),
  ).then((ok) => {
    if (!ok) return
    dislikeSent.add(target.messageId)
    showToast(
      resent
        ? '의견을 다시 보냈어요. 이전 의견은 새 의견으로 바뀌었어요'
        : switched
          ? '평가를 바꾸고 의견을 보냈어요'
          : '의견을 보냈어요. 고마워요',
      2800,
    )
  })
}

export function removeFeedback(target: Target, previous: MyFeedback | null) {
  return run(target, null, previous, () => feedbackApi.remove(target.messageId))
}

// ---- 게스트: 로그인 후 원래 평가로 돌아오기 (문서 1번) ----
const PENDING_KEY = 'telme-pending-feedback'

interface PendingFeedback extends Target {
  rating: Rating
}

export function requireLogin(target: Target, rating: Rating) {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ ...target, rating } satisfies PendingFeedback))
  openLoginSheet({ subtitle: '답변 평가는 로그인 후에 남길 수 있어요. 지금까지 나눈 상담도 그대로 옮겨져요' })
}

/** 로그인 후 이 대화로 돌아왔을 때 하던 평가가 있으면 꺼낸다 (한 번만) */
export function takePendingFeedback(sessionId: number): PendingFeedback | null {
  try {
    const p = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? 'null') as PendingFeedback | null
    if (!p || p.sessionId !== sessionId) return null
    sessionStorage.removeItem(PENDING_KEY)
    return p
  } catch {
    return null
  }
}

/** 캐시에 있는 지금 평가 (싫어요 시트에서 보낼 때 되돌리기용) */
export function currentFeedback({ sessionId, messageId }: Target): MyFeedback | null {
  return findMessage(sessionId, messageId)?.myFeedback ?? null
}
