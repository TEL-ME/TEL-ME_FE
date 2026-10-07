import { LocateFixed, MapIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ChatCoordinates } from '../../../api/chat'
import { locateErrorMessage, locateMe } from '../../stores/locate'
import { rememberMe } from '../../stores/storeSearchStore'
import { showToast } from '../../../stores/toastStore'
import { CHAT_GPS_ENABLED, DECLINE_ANSWER, NEARBY_QUESTION } from '../storeAsk'

interface LocationAskChipsProps {
  disabled: boolean
  onAsk: (question: string, coords?: ChatCoordinates) => void
}

const chip =
  'flex min-h-9 items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-sm font-semibold leading-5 text-ink no-underline disabled:opacity-50'

/**
 * 어느 지역 매장을 찾는지 되물었을 때, 말풍선 아래에 두는 빠른 답.
 * 지역 이름은 입력창에 직접 써도 된다.
 */
export default function LocationAskChips({ disabled, onAsk }: LocationAskChipsProps) {
  const [locating, setLocating] = useState(false)

  // 누르는 것 자체가 동의라서 따로 묻지 않는다. 처음이면 브라우저가 위치 권한을 묻는다
  const answerWithLocation = async () => {
    setLocating(true)
    try {
      const here = await locateMe()
      rememberMe(here)
      onAsk(NEARBY_QUESTION, { latitude: here.lat, longitude: here.lng })
    } catch (error) {
      showToast(locateErrorMessage(error, '위치 권한이 꺼져 있어요. 지역 이름을 알려 주세요'))
    } finally {
      setLocating(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {CHAT_GPS_ENABLED && (
        <button type="button" disabled={disabled || locating} onClick={() => void answerWithLocation()} className={chip}>
          <LocateFixed size={15} strokeWidth={2} aria-hidden className={locating ? 'tm-pulse' : ''} />
          {locating ? '위치 확인 중…' : '현재 위치 사용'}
        </button>
      )}
      <Link to="/stores" className={chip}>
        <MapIcon size={15} strokeWidth={2} aria-hidden />
        지도에서 찾기
      </Link>
      <button type="button" disabled={disabled || locating} onClick={() => onAsk(DECLINE_ANSWER)} className={chip}>
        {DECLINE_ANSWER}
      </button>
    </div>
  )
}
