import { apiUrl } from '../../api/client'
import { setLoginReturn } from './loginSheetStore'

/**
 * 로그인한 이메일 회원에게 카카오를 연결한다.
 * 카카오 인증을 다녀오면 로그인과 같은 /oauth/callback으로 돌아오므로, 연결 중이었다는 걸 sessionStorage에 적어 둔다.
 */
const LINK_KEY = 'telme-link-kakao'

export function startKakaoLink() {
  sessionStorage.setItem(LINK_KEY, '1')
  setLoginReturn('/settings')
  window.location.href = apiUrl('/api/v1/auth/kakao/link-start')
}

/** 콜백 화면에서 한 번만 꺼낸다 */
export function takeKakaoLink(): boolean {
  const linking = sessionStorage.getItem(LINK_KEY) === '1'
  sessionStorage.removeItem(LINK_KEY)
  return linking
}

/** 연결 실패 이유 (백엔드 redirect의 reason) */
export const LINK_FAIL_MESSAGE: Record<string, string> = {
  'MEMBER409-2': '이미 다른 계정에 연결된 카카오 계정이거나, 이 계정에 카카오가 이미 연결되어 있어요.',
  KAKAO_LINK_SESSION_MISMATCH: '연결하는 동안 로그인 상태가 바뀌었어요. 다시 시도해 주세요.',
  'MEMBER400-0': '연결 요청이 만료됐어요. 다시 시도해 주세요.',
  'MEMBER401-1': '로그인이 풀렸어요. 다시 로그인한 뒤 연결해 주세요.',
  'MEMBER403-0': '이용이 제한된 계정이에요.',
  'MEMBER403-1': '탈퇴한 계정이에요.',
}
export const LINK_FAIL_DEFAULT = '카카오를 연결하지 못했어요. 다시 시도해 주세요.'
