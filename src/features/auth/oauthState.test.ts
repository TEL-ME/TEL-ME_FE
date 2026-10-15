import { beforeEach, describe, expect, it } from 'vitest'
import { rememberLinking, rememberOauth, takeLinkingProvider, takeOauthProvider } from './oauthState'

beforeEach(() => sessionStorage.clear())

describe('oauthState', () => {
  it('연결하기를 취소하고 돌아와 일반 로그인을 하면 남은 연결 표시를 지운다', () => {
    rememberLinking('GOOGLE')
    rememberOauth('KAKAO')
    expect(takeLinkingProvider()).toBeUndefined()
    expect(takeOauthProvider()).toBe('KAKAO')
  })

  it('반대로 일반 로그인을 취소하고 연결하기를 하면 남은 로그인 표시를 지운다', () => {
    rememberOauth('KAKAO')
    rememberLinking('GOOGLE')
    expect(takeOauthProvider()).toBeNull()
    expect(takeLinkingProvider()).toBe('GOOGLE')
  })

  it('한 번 꺼내면 지워진다', () => {
    rememberLinking('KAKAO')
    expect(takeLinkingProvider()).toBe('KAKAO')
    expect(takeLinkingProvider()).toBeUndefined()
  })
})
