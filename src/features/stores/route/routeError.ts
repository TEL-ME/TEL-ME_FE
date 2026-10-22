import { ApiError } from '../../../api/client'
import type { RouteMode } from '../../../api/stores'
import { MODE_LABEL } from './routeText'

export interface RouteErrorView {
  message: string
  /** 같은 요청을 사용자가 다시 눌러 볼 만한가 (자동 재시도는 하지 않는다) */
  canRetry: boolean
  /** 다른 이동 수단을 골라 보라고 안내할까 */
  suggestOtherMode: boolean
  /** 매장을 이용할 수 없어 매장 목록으로 보낸다 */
  storeGone: boolean
}

/** 받침에 맞춰 '로'/'으로'를 붙인다 (ㄹ 받침은 '로') */
function withRo(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  if (code < 0 || code > 11171) return `${word}로`
  const jong = code % 28
  return `${word}${jong === 0 || jong === 8 ? '로' : '으로'}`
}

const GENERIC = '길찾기를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'

/**
 * 길찾기 오류를 화면 안내로 바꾼다. HTTP 상태가 아니라 본문 code로 구분한다.
 * STORE503-2는 키 오류·예산·통신 장애가 섞인 코드라 원인을 단정하지 않는다.
 */
export function routeErrorView(error: unknown, mode: RouteMode): RouteErrorView {
  const view = (message: string, canRetry: boolean, suggestOtherMode: boolean, storeGone = false): RouteErrorView => ({
    message,
    canRetry,
    suggestOtherMode,
    storeGone,
  })
  if (!(error instanceof ApiError)) return view(GENERIC, true, true)

  switch (error.code) {
    case 'STORE404-0':
      return view('이 매장은 지금 이용할 수 없어요. 다른 매장을 찾아 주세요.', false, false, true)
    case 'STORE404-1':
      return view(`${withRo(MODE_LABEL[mode])} 갈 수 있는 경로를 찾지 못했어요. 다른 이동 수단을 골라 보세요.`, false, true)
    case 'STORE400-5':
      return view('서비스에서 안내하는 최대 거리보다 먼 경로예요. 카카오맵에서 확인해 주세요.', false, true)
    // 하루 예산 소진: 서버 문구를 그대로 쓰고, 복구 시각은 약속하지 않는다. 다른 수단은 예산이 남았을 수 있다
    case 'STORE503-4':
      return view(error.message, false, true)
    // 운영자가 길찾기를 꺼 둠: 모든 수단에 적용되니 다른 수단을 권하지 않는다
    case 'STORE503-3':
      return view(error.message, false, false)
    case 'STORE503-2':
      return view(GENERIC, true, true)
    default:
      if (error.status === 400) return view('출발지나 이동 수단을 확인해 주세요.', false, false)
      return view(GENERIC, true, true)
  }
}
