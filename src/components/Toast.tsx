import { hideToast, useToastStore } from '../stores/toastStore'

export default function Toast() {
  const message = useToastStore((s) => s.message)
  const action = useToastStore((s) => s.action)
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[132px] z-50 flex justify-center px-4">
      {message && (
        <div
          role="status"
          className={`tm-rise flex items-center gap-3 rounded-full bg-inverse px-4 py-2.5 text-sm text-inverse-ink ${
            action ? 'pointer-events-auto' : ''
          }`}
        >
          {message}
          {action && (
            <button
              type="button"
              onClick={() => {
                hideToast()
                action.onClick()
              }}
              className="-my-1 font-bold underline underline-offset-[3px]"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
