import { act, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { createBrowserRouter, RouterProvider, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ClarityRouteTracker from './ClarityRouteTracker'
import { stopClarity } from './clarity'
import { markOnboarded } from '../features/onboarding/onboardingFlag'

let router: ReturnType<typeof createBrowserRouter> | undefined
const nativePush = window.history.pushState
const nativeReplace = window.history.replaceState

function OnboardingFixture() {
  const navigate = useNavigate()
  return <button onClick={() => { markOnboarded(); void navigate('/faq') }}>온보딩 완료</button>
}

function renderRoutes() {
  router = createBrowserRouter([{
    element: <ClarityRouteTracker />,
    children: [
      { path: '/onboarding', element: <OnboardingFixture /> },
      { path: '/faq', element: <main>고객 FAQ</main> },
      { path: '/settings', element: <main>고객 설정</main> },
      { path: '/stores', element: <main>고객 매장</main> },
      { path: '/admin/login', element: <main>관리자 로그인</main> },
    ],
  }])
  return render(<StrictMode><RouterProvider router={router} /></StrictMode>)
}

const navigate = async (path: string, replace = false) => {
  await act(async () => { await router?.navigate(path, { replace }) })
}

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', '/onboarding')
  vi.stubEnv('VITE_CLARITY_ENABLED', 'true')
  vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'testproject')
  vi.stubEnv('VITE_CLARITY_ENVIRONMENT', 'local')
})

afterEach(() => {
  router?.dispose()
  router = undefined
  stopClarity()
  window.history.pushState = nativePush
  window.history.replaceState = nativeReplace
  document.getElementById('telme-clarity')?.remove()
  delete window.clarity
  localStorage.clear()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('화면 이동과 Clarity 연결 — SDK 대역 사용', () => {
  it('온보딩 완료 후 고객 화면부터 연결된다', async () => {
    renderRoutes()
    expect(document.getElementById('telme-clarity')).toBeNull()
    await act(async () => screen.getByRole('button', { name: '온보딩 완료' }).click())
    expect(screen.getByText('고객 FAQ')).toBeInTheDocument()
    expect(document.querySelectorAll('#telme-clarity')).toHaveLength(1)
  })

  it('관리자 직접 진입에서는 완료 기기도 SDK를 연결하지 않는다', () => {
    localStorage.setItem('telme-onboarded', '1')
    window.history.replaceState(null, '', '/admin/login')
    renderRoutes()
    expect(screen.getByText('관리자 로그인')).toBeInTheDocument()
    expect(document.getElementById('telme-clarity')).toBeNull()
  })

  it('고객 화면·검색 조건 변경·뒤로 이동에서는 앱이 수집을 중단하거나 재시작하지 않는다', async () => {
    localStorage.setItem('telme-onboarded', '1')
    window.history.replaceState(null, '', '/faq')
    renderRoutes()
    const sdk = Object.assign(vi.fn(), { v: '테스트 SDK' })
    window.clarity = sdk

    await navigate('/settings')
    await navigate('/stores', true)
    await navigate('/faq?id=123#source')
    await act(async () => {
      const popped = new Promise(resolve => window.addEventListener('popstate', resolve, { once: true }))
      window.history.back()
      await popped
    })

    expect(screen.getByText('고객 매장')).toBeInTheDocument()
    expect(sdk).not.toHaveBeenCalled()
    expect(document.querySelectorAll('#telme-clarity')).toHaveLength(1)
  })

  it('제외 경계를 넘기 전에만 중단하고 고객 화면이 그려진 뒤 재개한다', async () => {
    localStorage.setItem('telme-onboarded', '1')
    window.history.replaceState(null, '', '/faq')
    renderRoutes()
    let active = true
    const starts: string[] = []
    const stoppedAt: string[] = []
    const sdk = Object.assign(vi.fn((method: unknown) => {
      if (method === 'stop') {
        active = false
        stoppedAt.push(window.location.pathname)
      }
      if (method === 'start') {
        active = true
        starts.push(document.body.textContent ?? '')
      }
    }), { v: '테스트 SDK' })
    window.clarity = sdk
    // SDK가 주소 변경 뒤 활성 상태이면 지연 재시작하는 경우를 모사한다.
    const originalPush = window.history.pushState
    window.history.pushState = function (...args) {
      originalPush.apply(this, args)
      if (active) setTimeout(() => sdk('start'), 1)
    }

    await navigate('/admin/login')
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) })
    expect(active).toBe(false)
    expect(starts).toEqual([])
    expect(stoppedAt).toEqual(['/faq'])

    await navigate('/faq')
    expect(active).toBe(true)
    expect(starts).toEqual(['고객 FAQ'])
    await navigate('/onboarding')
    expect(active).toBe(false)

    const back = async () => {
      await act(async () => {
        const popped = new Promise(resolve => window.addEventListener('popstate', resolve, { once: true }))
        window.history.back()
        await popped
      })
    }
    await back()
    expect(screen.getByText('고객 FAQ')).toBeInTheDocument()
    expect(active).toBe(true)
    await back()
    expect(screen.getByText('관리자 로그인')).toBeInTheDocument()
    expect(active).toBe(false)
    expect(router?.state.blockers.size).toBe(0)
  })

  it('기존 주소 이동 함수와 구독자를 덮어쓰거나 이동을 차단하지 않는다', async () => {
    const push = vi.spyOn(window.history, 'pushState')
    const replace = vi.spyOn(window.history, 'replaceState')
    localStorage.setItem('telme-onboarded', '1')
    window.history.replaceState(null, '', '/faq')
    renderRoutes()
    expect(window.history.pushState).toBe(push)
    expect(window.history.replaceState).toBe(replace)
    await navigate('/settings')
    await navigate('/admin/login', true)
    expect(push).toHaveBeenCalled()
    expect(replace).toHaveBeenCalled()
    expect(screen.getByText('관리자 로그인')).toBeInTheDocument()
  })

  it('고객 화면의 SDK 지연 재시작 중 제외 화면으로 이동해도 관리자에서 재시작하지 않는다', async () => {
    localStorage.setItem('telme-onboarded', '1')
    window.history.replaceState(null, '', '/faq')
    renderRoutes()
    const starts: string[] = []
    const sdk = Object.assign(vi.fn((method: unknown) => {
      if (method === 'start') starts.push(window.location.pathname)
      if (method === 'stop') window.clarity = Object.assign(vi.fn(), { q: [] })
    }), { v: '테스트 SDK' })
    window.clarity = sdk
    await navigate('/settings')
    // 실제 SDK의 고객 화면 전환 중 비활성 큐와 예약된 내부 재시작을 모사한다.
    window.clarity = Object.assign(vi.fn(), { q: [] })
    const restarted = new Promise<void>(resolve => setTimeout(() => {
      window.clarity = sdk
      sdk('start')
      resolve()
    }, 20))
    await navigate('/admin/login')
    await act(async () => {
      await restarted
      await new Promise(resolve => setTimeout(resolve, 40))
    })
    expect(starts).not.toContain('/admin/login')
    expect(screen.getByText('관리자 로그인')).toBeInTheDocument()
  })

  it('SDK 재시작이 끝나지 않으면 1초 후 제외 주소로 전체 이동을 한 번 요청한다', async () => {
    localStorage.setItem('telme-onboarded', '1')
    window.history.replaceState(null, '', '/faq')
    const rendered = renderRoutes()
    window.clarity = Object.assign(vi.fn(), { q: [] })

    // jsdom에서는 실제 페이지 이동 대신 주소·요청 횟수와 타이머 정리를 검사한다.
    const realWindow = window
    const assign = vi.fn()
    const fakeLocation = new Proxy({}, {
      get(_target, key) {
        return key === 'assign' ? assign : Reflect.get(realWindow.location, key, realWindow.location)
      },
    })
    vi.stubGlobal('window', new Proxy(realWindow, {
      get(target, key) {
        return key === 'location' ? fakeLocation : Reflect.get(target, key, target)
      },
    }))
    vi.useFakeTimers()

    await navigate('/admin/login?from=clarity#test')
    expect(screen.getByText('고객 FAQ')).toBeInTheDocument()
    expect(assign).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(999) })
    expect(assign).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(101) })

    expect(assign.mock.calls).toEqual([['/admin/login?from=clarity#test']])
    rendered.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('이동 대기 중 다른 고객 메뉴를 선택하면 이전 관리자 이동을 실행하지 않는다', async () => {
    localStorage.setItem('telme-onboarded', '1')
    window.history.replaceState(null, '', '/faq')
    renderRoutes()
    window.clarity = Object.assign(vi.fn(), { q: [] })
    vi.useFakeTimers()

    await navigate('/admin/login')
    expect(screen.getByText('고객 FAQ')).toBeInTheDocument()
    await navigate('/stores')
    window.clarity = Object.assign(vi.fn(), { v: '테스트 SDK' })
    await act(async () => { await vi.advanceTimersByTimeAsync(1200) })

    expect(screen.getByText('고객 매장')).toBeInTheDocument()
    expect(router?.state.location.pathname).toBe('/stores')
    expect([...router!.state.blockers.values()].every(blocker => blocker.state === 'unblocked')).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
})
