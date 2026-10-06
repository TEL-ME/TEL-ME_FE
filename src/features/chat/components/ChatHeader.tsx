import { Menu, Plus } from 'lucide-react'

interface ChatHeaderProps {
  busy: boolean
  onOpenList: () => void
  onNewChat: () => void
}

const iconButton =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface text-ink disabled:opacity-50'

export default function ChatHeader({ busy, onOpenList, onNewChat }: ChatHeaderProps) {
  return (
    <header className="flex shrink-0 items-center gap-3 bg-bg p-4">
      <button type="button" aria-label="대화 목록" onClick={onOpenList} className={iconButton}>
        <Menu size={20} strokeWidth={1.8} aria-hidden />
      </button>
      <div className="min-w-0 flex-1">
        <h1 aria-label="TEL-ME" className="m-0 font-logo text-[28px] font-black leading-7 tracking-[-0.8px] text-ink">
          tel<span className="text-brand-text">me</span>
        </h1>
        <p className="mt-0.5 flex items-center gap-1.5 text-[13px] leading-[18px] text-ink-sub">
          <span
            aria-hidden
            className={`h-2 w-2 rounded-full ${busy ? 'tm-pulse bg-brand' : 'bg-[#86a897]'}`}
          />
          {busy ? '답변을 준비하는 중' : '무러바라와 이야기하는 중'}
        </p>
      </div>
      <button type="button" aria-label="새 대화" onClick={onNewChat} disabled={busy} className={iconButton}>
        <Plus size={20} strokeWidth={1.8} aria-hidden />
      </button>
    </header>
  )
}
