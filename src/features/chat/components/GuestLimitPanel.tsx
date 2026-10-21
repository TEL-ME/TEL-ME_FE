import { openLoginSheet } from '../../auth/loginSheetStore'
import { GUEST_LIMIT_LOGIN_NOTE } from '../guestLimitStore'

/**
 * 게스트가 오늘 질문을 모두 썼을 때 입력창 자리에 둔다 (백엔드 TELME-213).
 * 종료된 대화 안내와 같은 모양으로, 이어서 물어보려면 로그인하도록 안내한다. 한국 시간 0시에 풀린다
 */
export default function GuestLimitPanel() {
  return (
    <div role="status" className="flex items-center gap-3 rounded-[28px] bg-surface py-2.5 pl-4 pr-2.5 text-sm text-ink-sub">
      <span className="min-w-0 flex-1 leading-5">
        <span className="block font-semibold text-ink">오늘 비회원 질문을 모두 썼어요</span>
        내일 0시에 다시 열려요
      </span>
      <button
        type="button"
        onClick={() => openLoginSheet({ subtitle: GUEST_LIMIT_LOGIN_NOTE })}
        className="min-h-10 shrink-0 rounded-2xl bg-brand px-4 text-sm font-bold text-white"
      >
        로그인
      </button>
    </div>
  )
}
