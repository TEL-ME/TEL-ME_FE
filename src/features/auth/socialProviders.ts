/**
 * 소셜 로그인 버튼 목록. 두 번째 소셜(구글 또는 네이버)은 추후 추가 예정이라 자리만 두고 꺼 둔다.
 * 정해지면 label·style·authPath를 채우고 enabled를 true로 바꾼다.
 */
export interface SocialProvider {
  id: 'kakao' | 'second'
  label: string
  enabled: boolean
  /** 백엔드 OAuth 시작 주소 (Vite 프록시로 백엔드에 간다) */
  authPath: string
  className: string
}

export const SOCIAL_PROVIDERS: SocialProvider[] = [
  {
    id: 'kakao',
    label: '카카오로 시작하기',
    enabled: true,
    authPath: '/oauth2/authorization/kakao',
    className: 'bg-[#fee500] text-[#191600]',
  },
  {
    id: 'second',
    label: '준비 중',
    enabled: false,
    authPath: '',
    className: 'bg-surface text-ink border-[1.5px] border-line',
  },
]

export function startSocialLogin(provider: SocialProvider) {
  if (!provider.enabled) return
  window.location.href = provider.authPath
}
