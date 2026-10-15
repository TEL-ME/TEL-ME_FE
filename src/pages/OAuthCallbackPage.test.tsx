import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLoginSheet } from '../features/auth/loginSheetStore'
import { useToastStore } from '../stores/toastStore'
import OAuthCallbackPage from './OAuthCallbackPage'

const ME = { authenticated: true, userId: 1, email: 'a@b.c', name: '홍길동', role: 'USER', loginMethods: ['EMAIL', 'GOOGLE'] }

/** 도착한 화면의 주소와 넘겨받은 state를 보여준다 */
function Landed() {
  const { pathname, state } = useLocation()
  return <p data-testid="landed">{pathname + ' ' + JSON.stringify(state)}</p>
}

function renderCallback(query: string) {
  render(
    <MemoryRouter initialEntries={[`/oauth/callback?${query}`]}>
      <Routes>
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="*" element={<Landed />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  sessionStorage.clear()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ isSuccess: true, code: '200', message: 'OK', result: ME }), { status: 200 })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  useLoginSheet.setState({ open: false, subtitle: null, error: null })
})

describe('OAuthCallbackPage', () => {
  it('설정에서 연결 성공: /auth/me를 다시 받고 설정으로 가서 알린다', async () => {
    sessionStorage.setItem('linkingProvider', 'GOOGLE')
    renderCallback('success=true')
    await waitFor(() => expect(useToastStore.getState().message).toBe('Google 계정을 연결했어요'))
    expect(screen.getByTestId('landed').textContent).toContain('/settings')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/auth/me'), expect.anything())
    expect(sessionStorage.getItem('linkingProvider')).toBeNull()
  })

  it('설정에서 연결 실패(MEMBER409-2): 제공자 이름으로 이유를 넘긴다', async () => {
    sessionStorage.setItem('linkingProvider', 'KAKAO')
    renderCallback('success=false&reason=MEMBER409-2')
    const landed = await screen.findByTestId('landed')
    expect(landed.textContent).toContain('/settings')
    expect(landed.textContent).toContain('카카오 계정을 연결하지 못했어요')
    expect(landed.textContent).toContain('이 카카오 계정은 이미 다른 TEL-ME 계정에서 쓰고 있어서')
  })

  it('연결 흐름 이유인데 저장값이 없으면 공통 문구', async () => {
    renderCallback('success=false&reason=KAKAO_LINK_SESSION_MISMATCH')
    const landed = await screen.findByTestId('landed')
    expect(landed.textContent).toContain('소셜 계정을 연결하지 못했어요')
  })

  it('일반 로그인에서 같은 이메일 계정(MEMBER409-1)이면 선택 화면으로 간다', async () => {
    sessionStorage.setItem('oauthProvider', 'GOOGLE')
    sessionStorage.setItem('telme-login-return', '/my')
    renderCallback('success=false&reason=MEMBER409-1')
    const landed = await screen.findByTestId('landed')
    expect(landed.textContent).toContain('/auth/social-match')
    expect(landed.textContent).toContain('"provider":"GOOGLE"')
    // 선택이 끝나면 돌아갈 곳은 남겨 둔다
    expect(sessionStorage.getItem('telme-login-return')).toBe('/my')
    expect(sessionStorage.getItem('oauthProvider')).toBeNull()
  })

  it('일반 로그인 실패는 로그인 시트에 제공자 이름으로 알린다', async () => {
    sessionStorage.setItem('oauthProvider', 'GOOGLE')
    renderCallback('success=false&reason=UNKNOWN')
    await waitFor(() => expect(useLoginSheet.getState().error).toBe('Google 로그인이 완료되지 않았어요. 다시 시도해 주세요.'))
  })
})
