import { hideToast, useToastStore } from '../stores/toastStore'

const PILL = 'tm-rise flex items-center gap-3 rounded-full bg-inverse px-4 py-2.5 text-sm text-inverse-ink'

export default function Toast() {
  const message = useToastStore((s) => s.message)
  const action = useToastStore((s) => s.action)
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[132px] z-50 flex justify-center px-4">
      {message &&
        (action ? (
          // 버튼 글자만 누르기 어려워 토스트 전체를 누를 수 있게 한다
          <button
            type="button"
            onClick={() => {
              hideToast()
              action.onClick()
            }}
            className={`${PILL} pointer-events-auto min-h-11 text-left`}
          >
            {message}
            <span className="font-bold underline underline-offset-[3px]">{action.label}</span>
          </button>
        ) : (
          <div role="status" className={PILL}>
            {message}
          </div>
        ))}
    </div>
  )
}
