import { ThumbsDown, ThumbsUp } from 'lucide-react'
import type { MyFeedback } from '../../api/types'
import { openDislikeSheet, removeFeedback, requireLogin, saveLike } from './feedbackActions'

interface FeedbackButtonsProps {
  sessionId: number
  messageId: number
  myFeedback: MyFeedback | null
  isUser: boolean
}

/**
 * 좋아요·싫어요 (문서 10번). 아이콘 중심.
 * 👍 즉시 저장 · 👎 이유 선택 · 선택된 걸 다시 누르면 취소 · 서로 바꾸기 가능 · 게스트는 로그인 유도
 */
export default function FeedbackButtons({ sessionId, messageId, myFeedback, isUser }: FeedbackButtonsProps) {
  const target = { sessionId, messageId }
  const liked = myFeedback?.rating === 'LIKE'
  const disliked = myFeedback?.rating === 'DISLIKE'

  const onLike = () => {
    if (!isUser) return requireLogin(target, 'LIKE')
    if (liked) void removeFeedback(target, myFeedback)
    else void saveLike(target, myFeedback)
  }
  const onDislike = () => {
    if (!isUser) return requireLogin(target, 'DISLIKE')
    if (disliked) void removeFeedback(target, myFeedback)
    else openDislikeSheet(target)
  }

  const cls = (on: boolean) =>
    `flex h-9 w-9 items-center justify-center rounded-full ${on ? 'bg-brand-soft text-brand-strong' : 'bg-surface text-ink-sub'}`

  return (
    <div className="flex gap-1.5">
      <button type="button" aria-label="도움됐어요" aria-pressed={liked} onClick={onLike} className={cls(liked)}>
        <ThumbsUp size={16} strokeWidth={1.8} fill={liked ? 'currentColor' : 'none'} aria-hidden />
      </button>
      <button type="button" aria-label="아쉬워요" aria-pressed={disliked} onClick={onDislike} className={cls(disliked)}>
        <ThumbsDown size={16} strokeWidth={1.8} fill={disliked ? 'currentColor' : 'none'} aria-hidden />
      </button>
    </div>
  )
}
