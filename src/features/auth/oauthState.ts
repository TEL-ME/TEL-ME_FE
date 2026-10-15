import type { SocialProviderCode } from '../../api/types'

/**
 * 소셜 인증을 다녀오는 동안 sessionStorage에 남겨 두는 값. 둘 다 /oauth/callback에서 한 번만 꺼낸다.
 * - linkingProvider: 설정 › 연결하기로 떠난 제공자
 * - oauthProvider: 일반 로그인으로 떠난 제공자
 * 한쪽을 시작할 때 다른 쪽을 지워서, 취소하고 돌아와 남은 값이 다음 콜백을 잘못 판단하게 하지 않는다.
 */
const LINK_KEY = 'linkingProvider'
const OAUTH_KEY = 'oauthProvider'

export const asProvider = (v: string | null | undefined): SocialProviderCode | null =>
  v === 'KAKAO' || v === 'GOOGLE' ? v : null

function write(key: string, value: SocialProviderCode, other: string) {
  try {
    sessionStorage.removeItem(other)
    sessionStorage.setItem(key, value)
  } catch {
    // 저장이 막혀도 인증은 진행한다 (결과 문구만 "소셜 계정"으로 나온다)
  }
}

function take(key: string): string | null {
  try {
    const v = sessionStorage.getItem(key)
    sessionStorage.removeItem(key)
    return v
  } catch {
    return null
  }
}

export const rememberLinking = (provider: SocialProviderCode) => write(LINK_KEY, provider, OAUTH_KEY)
export const rememberOauth = (provider: SocialProviderCode) => write(OAUTH_KEY, provider, LINK_KEY)

/** undefined: 연결 중이 아니었음 · null: 연결 중이었는데 제공자 값이 이상함 */
export function takeLinkingProvider(): SocialProviderCode | null | undefined {
  const v = take(LINK_KEY)
  return v == null ? undefined : asProvider(v)
}

export const takeOauthProvider = (): SocialProviderCode | null => asProvider(take(OAUTH_KEY))
