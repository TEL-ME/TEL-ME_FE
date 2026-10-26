import type { SocialProviderCode } from '../../api/types'
import { rememberOauth } from './oauthState'

export { asProvider, takeOauthProvider } from './oauthState'

/** 화면에 쓰는 이름. "{이름}로 로그인", "{이름} 계정을 연결했어요" */
export const PROVIDER_NAME: Record<SocialProviderCode, string> = { KAKAO: '카카오', GOOGLE: 'Google' }

export interface SocialProvider {
  code: SocialProviderCode
  label: string
  /** 시작하기 마지막 화면처럼 짧게 쓸 때 */
  shortLabel: string
  /** 백엔드 OAuth 시작 주소 (Vite 프록시로 백엔드에 간다) */
  authPath: string
  className: string
}

export const SOCIAL_PROVIDERS: SocialProvider[] = [
  {
    code: 'KAKAO',
    label: '카카오로 시작하기',
    shortLabel: '카카오로 로그인',
    authPath: '/oauth2/authorization/kakao',
    className: 'bg-[#fee500] text-[#191600]',
  },
  {
    code: 'GOOGLE',
    label: 'Google로 시작하기',
    shortLabel: 'Google로 로그인',
    authPath: '/oauth2/authorization/google',
    className: 'border-[1.5px] border-line bg-white text-[#1f1f1f]',
  },
]

export function startSocialLogin(provider: SocialProvider) {
  // 연결하기를 취소하고 돌아와 남은 linkingProvider도 여기서 지운다
  rememberOauth(provider.code)
  window.location.href = provider.authPath
}
