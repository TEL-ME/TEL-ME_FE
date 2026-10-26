import { apiUrl } from '../../api/client'
import type { SocialProviderCode } from '../../api/types'
import { rememberLinking } from './oauthState'
import { setLoginReturn } from './loginSheetStore'
import { PROVIDER_NAME } from './socialProviders'

export { takeLinkingProvider } from './oauthState'

/**
 * 로그인한 회원에게 소셜 로그인(카카오·Google)을 연결한다.
 * 인증을 다녀오면 로그인과 같은 /oauth/callback으로 돌아오므로, 어느 제공자를 연결하던 중인지 적어 둔다 (oauthState).
 */
export function startSocialLink(provider: SocialProviderCode) {
  // 일반 로그인을 취소하고 돌아와 남은 oauthProvider도 여기서 지운다
  rememberLinking(provider)
  setLoginReturn('/settings')
  window.location.href = apiUrl(`/api/v1/auth/${provider.toLowerCase()}/link-start`)
}

/** 연결 흐름에서만 오는 실패 이유. 저장값이 없어도 연결 실패로 본다 */
export const LINK_ONLY_REASONS = ['KAKAO_LINK_SESSION_MISMATCH', 'MEMBER400-0']

export interface LinkFailure {
  title: string
  message: string
}

/** 연결 실패 안내 (백엔드 redirect의 reason). 제공자를 모르면 공통 문구 */
export function linkFailure(provider: SocialProviderCode | null, reason: string): LinkFailure {
  if (!provider) return { title: '소셜 계정을 연결하지 못했어요', message: '다시 시도해 주세요.' }
  const name = PROVIDER_NAME[provider]
  const messages: Record<string, string> = {
    'MEMBER409-2': `이 ${name} 계정은 이미 다른 TEL-ME 계정에서 쓰고 있어서 연결할 수 없어요. 그 계정으로 로그인해 이용해 주세요.`,
    'MEMBER400-0': '연결 요청이 만료됐어요. 다시 시도해 주세요.',
    KAKAO_LINK_SESSION_MISMATCH: '연결하는 동안 로그인 상태가 바뀌었어요. 다시 시도해 주세요.',
    'MEMBER401-1': '로그인이 풀렸어요. 다시 로그인한 뒤 연결해 주세요.',
    'MEMBER403-0': '이용이 제한된 계정이에요.',
    'MEMBER403-1': '탈퇴한 계정이에요.',
  }
  return { title: `${name} 계정을 연결하지 못했어요`, message: messages[reason] ?? '다시 시도해 주세요.' }
}
