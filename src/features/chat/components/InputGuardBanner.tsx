import { ShieldAlert, X } from 'lucide-react'
import { clearInputGuardNotice, useInputGuard } from '../inputGuardStore'
import { useRestrictionText } from '../useRestrictionText'

/** 입력창 위 안내: 욕설 경고·민감정보 재입력·일시 제한 (서버 문구 그대로) */
export default function InputGuardBanner() {
  const notice = useInputGuard((s) => s.notice)
  const restriction = useRestrictionText()
  if (!notice) return null
  return (
    <div role="status" className="flex items-start gap-2 rounded-2xl bg-notice px-3.5 py-2.5 text-[13px] leading-5 text-notice-text">
      <ShieldAlert size={16} strokeWidth={2} aria-hidden className="mt-0.5 shrink-0" />
      <span className="min-w-0 flex-1">
        {notice.message}
        {notice.action === 'RESTRICTED' && restriction && <span className="block font-semibold">{restriction}</span>}
      </span>
      {notice.action !== 'RESTRICTED' && (
        <button type="button" aria-label="안내 닫기" onClick={clearInputGuardNotice} className="-m-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
          <X size={15} aria-hidden />
        </button>
      )}
    </div>
  )
}
