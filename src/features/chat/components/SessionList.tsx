import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { chatApi } from '../../../api/chat'
import { ApiError } from '../../../api/client'
import { formatListDate } from '../../../lib/date'
import { showToast } from '../../../stores/toastStore'
import { sessionsKey, useSessions } from '../sessionQueries'
import SessionTitleEditor from './SessionTitleEditor'

interface SessionListProps {
  currentId: number | null
  busy: boolean
  onPick: (sessionId: number) => void
  onNewChat: () => void
  /** 드로어일 때만 닫기 버튼을 보여 준다 */
  onClose?: () => void
}

/** 대화 목록 (드로어 안). 연필 버튼으로 제목을 바꾼다. 삭제 메뉴는 이번엔 숨김 */
export default function SessionList({ currentId, busy, onPick, onNewChat, onClose }: SessionListProps) {
  const query = useSessions()
  const sessions = query.data?.pages.flatMap((p) => p.sessions) ?? []
  const closeRef = useRef<HTMLButtonElement>(null)
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const rename = async (sessionId: number, title: string) => {
    setSaving(true)
    try {
      await chatApi.updateTitle(sessionId, title)
      await queryClient.invalidateQueries({ queryKey: sessionsKey })
      setEditingId(null)
      showToast('대화 제목을 바꿨어요')
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '제목을 바꾸지 못했어요')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  return (
    <div className="flex h-full flex-col gap-3.5 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-bold">대화 목록</h2>
        {onClose && (
          <button
            ref={closeRef}
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-ink"
          >
            <X size={20} strokeWidth={1.8} aria-hidden />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onNewChat}
        disabled={busy}
        className="flex min-h-[52px] items-center justify-center gap-1.5 rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-60"
      >
        <Plus size={18} strokeWidth={2.2} aria-hidden />새 대화
      </button>

      <div className="no-scrollbar -mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        {query.isPending && <p className="px-2 py-3 text-sm text-ink-muted">불러오는 중…</p>}
        {query.isError && (
          <div className="flex flex-col items-start gap-2 px-2 py-3 text-sm text-ink-sub">
            대화 목록을 불러오지 못했어요.
            <button type="button" onClick={() => query.refetch()} className="font-bold text-brand-text underline">
              다시 불러오기
            </button>
          </div>
        )}
        {query.isSuccess && sessions.length === 0 && (
          <p className="px-2 py-3 text-sm text-ink-muted">아직 나눈 상담이 없어요</p>
        )}

        <ul className="flex flex-col gap-1.5">
          {sessions.map((s) => {
            const current = s.sessionId === currentId
            if (editingId === s.sessionId) {
              return (
                <li key={s.sessionId}>
                  <SessionTitleEditor
                    initial={s.title ?? ''}
                    saving={saving}
                    onSave={(title) => void rename(s.sessionId, title)}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              )
            }
            return (
              <li
                key={s.sessionId}
                className={`flex items-center rounded-[14px] ${current ? 'bg-surface' : ''}`}
              >
                <button
                  type="button"
                  aria-current={current ? 'true' : undefined}
                  disabled={busy && !current}
                  onClick={() => onPick(s.sessionId)}
                  className="flex min-w-0 flex-1 flex-col gap-1 py-2.5 pl-3 pr-1 text-left text-ink disabled:opacity-50"
                >
                  <span className="max-w-full truncate text-sm font-semibold">{s.title || '새 대화'}</span>
                  <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                    {formatListDate(s.lastActiveAt)}
                    {s.status === 'NEED_CLARIFICATION' && (
                      <span className="rounded-full bg-brand-soft px-[7px] py-px text-[11px] font-bold text-brand-strong">
                        답변 기다리는 중
                      </span>
                    )}
                    {s.status === 'CLOSED' && (
                      <span className="rounded-full bg-surface-2 px-[7px] py-px text-[11px] font-bold text-ink-sub">
                        종료됨
                      </span>
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`${s.title || '새 대화'} 제목 바꾸기`}
                  onClick={() => setEditingId(s.sessionId)}
                  disabled={saving}
                  className="mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-muted opacity-70 hover:opacity-100"
                >
                  <Pencil size={15} strokeWidth={1.9} aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>

        {query.hasNextPage && (
          <button
            type="button"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            className="mt-2 w-full rounded-xl py-2.5 text-sm font-semibold text-ink-sub"
          >
            {query.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
          </button>
        )}
      </div>
    </div>
  )
}
