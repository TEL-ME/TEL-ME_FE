import { CircleAlert } from 'lucide-react'
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  /** 오류 문구 아래에 붙는 것 (예: 이 이메일로 로그인하기) */
  errorAction?: ReactNode
}

/** 라벨 + 입력칸 + 오류 문구. react-hook-form register와 함께 쓴다 */
const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, errorAction, ...input },
  ref,
) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] font-bold leading-[18px] text-ink-sub">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`h-[52px] w-full rounded-2xl border-[1.5px] bg-surface px-4 text-base text-ink outline-none placeholder:text-ink-muted focus:border-brand ${
          error ? 'border-danger' : 'border-transparent'
        }`}
        {...input}
      />
      {error ? (
        <div>
          <p id={errorId} role="alert" className="flex gap-1.5 text-[13px] font-semibold leading-[18px] text-danger">
            <CircleAlert size={16} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
            <span>{error}</span>
          </p>
          {errorAction && <div className="ml-[22px] mt-1">{errorAction}</div>}
        </div>
      ) : (
        hint && (
          <p id={hintId} className="px-1 text-xs leading-4 text-ink-sub">
            {hint}
          </p>
        )
      )}
    </div>
  )
})

export default TextField
