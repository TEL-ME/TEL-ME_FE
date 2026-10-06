import { useToastStore } from '../stores/toastStore'

export default function Toast() {
  const message = useToastStore((s) => s.message)
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[132px] z-50 flex justify-center px-4">
      {message && (
        <div role="status" className="tm-rise rounded-full bg-inverse px-4 py-2.5 text-sm text-inverse-ink">
          {message}
        </div>
      )}
    </div>
  )
}
