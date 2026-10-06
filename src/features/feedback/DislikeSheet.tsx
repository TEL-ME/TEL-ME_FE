import { useEffect, useId, useRef, useState } from 'react'
import type { DislikeReason } from '../../api/types'
import { closeDislikeSheet, currentFeedback, DISLIKE_REASONS, saveDislike, useDislikeSheet } from './feedbackActions'

/** 싫어요 이유 선택 (Sheet-Dislike) */
export default function DislikeSheet() {
  const target = useDislikeSheet((s) => s.target)
  if (!target) return null
  return <SheetBody key={`${target.sessionId}-${target.messageId}`} />
}

function SheetBody() {
  const target = useDislikeSheet((s) => s.target)!
  const [reason, setReason] = useState<DislikeReason | null>(null)
  const [comment, setComment] = useState('')
  const titleId = useId()
  const commentId = useId()
  const firstRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    firstRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeDislikeSheet()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const send = () => {
    if (!reason) return
    closeDislikeSheet()
    void saveDislike(target, currentFeedback(target), reason, comment)
  }

  return (
    <div className="absolute inset-0 z-40">
      <button type="button" aria-label="닫기" onClick={closeDislikeSheet} className="absolute inset-0 bg-[rgba(30,18,26,0.36)]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="tm-rise absolute inset-x-0 bottom-0 flex flex-col gap-3 rounded-t-[28px] bg-surface px-5 pb-5 pt-6"
      >
        <h3 id={titleId} className="text-[19px] font-extrabold">
          어떤 점이 아쉬웠나요?
        </h3>
        <div role="radiogroup" aria-label="아쉬운 점" className="flex flex-col gap-2">
          {DISLIKE_REASONS.map((r, i) => {
            const on = reason === r.code
            return (
              <button
                key={r.code}
                ref={i === 0 ? firstRef : undefined}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setReason(r.code)}
                className={`flex min-h-12 items-center rounded-full border-[1.5px] px-4 py-2.5 text-left text-[15px] font-medium ${
                  on ? 'border-brand bg-brand text-white' : 'border-surface-2 bg-surface-2 text-ink'
                }`}
              >
                {r.label}
              </button>
            )
          })}
        </div>
        <label htmlFor={commentId} className="flex flex-col gap-2 text-[13px] font-semibold text-ink-sub">
          <span>
            더 남기고 싶은 말 <span className="font-normal text-ink-muted">(선택)</span>
          </span>
          <textarea
            id={commentId}
            rows={3}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="무러바라가 더 나아질 수 있게 알려주세요"
            className="w-full resize-none rounded-2xl bg-surface-2 p-3 text-[15px] font-normal leading-[22px] text-ink outline-none placeholder:text-ink-muted"
          />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={closeDislikeSheet}
            className="min-h-[52px] rounded-2xl border-[1.5px] border-line text-base font-bold text-ink"
          >
            취소
          </button>
          <button
            type="button"
            onClick={send}
            disabled={!reason}
            className="col-span-2 min-h-[52px] rounded-2xl bg-brand text-base font-bold text-white disabled:bg-line disabled:text-ink-muted"
          >
            보내기
          </button>
        </div>
      </div>
    </div>
  )
}
