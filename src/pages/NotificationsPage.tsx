import { BellOff, ChevronLeft, CircleAlert, MessageSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { AppNotification } from '../api/types'
import { useNotifications } from '../features/notifications/queries'
import { goBack } from '../features/stores/goBack'
import { formatAdminTime } from '../lib/date'

/** 본문이 비어 있을 때(실패 알림 등) 대신 보여 줄 문구 */
const FALLBACK_BODY: Record<AppNotification['type'], string> = {
  ANSWER_ARRIVED: '답변이 도착했어요',
  ANSWER_FAILED: '답변을 받지 못했어요. 대화에서 다시 시도해 주세요',
}

function NotificationItem({ item, onOpen }: { item: AppNotification; onOpen: () => void }) {
  const failed = item.type === 'ANSWER_FAILED'
  const Icon = failed ? CircleAlert : MessageSquare
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`flex w-full items-start gap-3 rounded-2xl px-4 py-3.5 text-left ${item.read ? 'bg-surface' : 'bg-brand-soft'}`}
      >
        <span
          aria-hidden
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            failed ? 'bg-surface-2 text-danger' : 'bg-surface text-brand-text'
          }`}
        >
          <Icon size={18} strokeWidth={2} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <strong className="min-w-0 flex-1 truncate text-[15px] font-bold leading-[22px] text-ink">
              {item.title?.trim() || '상담'}
            </strong>
            <span className="shrink-0 text-xs leading-[18px] text-ink-muted">{formatAdminTime(item.createdAt)}</span>
          </span>
          <span className="line-clamp-2 break-words text-sm leading-5 text-ink-sub">
            {item.body?.trim() || FALLBACK_BODY[item.type]}
          </span>
        </span>
        {!item.read && (
          <>
            <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-danger" />
            <span className="sr-only">안 읽음</span>
          </>
        )}
      </button>
    </li>
  )
}

/** 마이 › 알림: 다른 화면에 있을 때 도착한 답변. 누르면 그 대화로 가고, 대화를 열면 읽음 처리된다 */
export default function NotificationsPage() {
  const navigate = useNavigate()
  const query = useNotifications()
  const items = query.data?.pages.flatMap((p) => p.notifications) ?? []

  return (
    <main className="no-scrollbar mx-auto flex w-full max-w-[480px] flex-1 flex-col overflow-y-auto">
      <header className="flex shrink-0 items-center gap-2 pb-2 pl-2 pr-4 pt-3">
        <button
          type="button"
          aria-label="뒤로"
          onClick={() => goBack(navigate, '/my')}
          className="flex h-11 w-11 shrink-0 items-center justify-center text-ink"
        >
          <ChevronLeft size={22} strokeWidth={2} aria-hidden />
        </button>
        <h1 className="m-0 text-lg font-bold leading-6 text-ink">알림</h1>
      </header>

      <div className="flex flex-1 flex-col px-4 pb-6">
        {query.isPending ? (
          <p className="py-10 text-center text-sm text-ink-muted">불러오는 중…</p>
        ) : query.isError ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <p className="m-0 text-sm text-ink-sub">알림을 불러오지 못했어요</p>
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="rounded-full bg-surface px-4 py-2 text-sm font-semibold text-ink"
            >
              다시 시도
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-ink-muted">
            <BellOff size={28} strokeWidth={1.6} aria-hidden />
            <p className="m-0 text-sm">새 알림이 없어요</p>
          </div>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {items.map((item) => (
                <NotificationItem key={item.notificationId} item={item} onOpen={() => navigate(`/chat/${item.sessionId}`)} />
              ))}
            </ul>
            {query.hasNextPage && (
              <button
                type="button"
                disabled={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
                className="mx-auto mt-3 rounded-full bg-surface px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
              >
                {query.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
              </button>
            )}
          </>
        )}
      </div>
    </main>
  )
}
