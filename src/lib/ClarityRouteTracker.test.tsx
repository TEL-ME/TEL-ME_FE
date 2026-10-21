import { act, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { createBrowserRouter, RouterProvider, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ClarityRouteTracker from './ClarityRouteTracker'
import { bindClarityNavigation, stopClarity } from './clarity'
import { markOnboarded } from '../features/onboarding/onboardingFlag'

let router: ReturnType<typeof createBrowserRouter> | undefined
let unbind: (() => void) | undefined
const nativePush = window.history.pushState
const nativeReplace = window.history.replaceState

function OnboardingFixture() {
    const navigate = useNavigate()
    return <button onClick={() => { markOnboarded(); void navigate('/faq') }}>온보딩 완료</button>
}

function renderRoutes() {
    unbind = bindClarityNavigation()
    router = createBrowserRouter([{
        element: <ClarityRouteTracker />,
        children: [
            { path: '/onboarding', element: <OnboardingFixture /> },
            { path: '/faq', element: <main>고객 FAQ</main> },
            { path: '/admin/login', element: <main>관리자 로그인</main> },
        ],
    }])
    return render(<StrictMode><RouterProvider router={router} /></StrictMode>)
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
    unbind?.()
    unbind = undefined
    stopClarity()
    window.history.pushState = nativePush
    window.history.replaceState = nativeReplace
    document.getElementById('telme-clarity')?.remove()
    delete window.clarity
    localStorage.clear()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
})

describe('화면 이동과 Clarity 연결 — SDK 대역 사용', () => {
    it('온보딩 완료 버튼으로 기존 완료 표시가 저장되고 고객 화면부터 연결된다', async () => {
        renderRoutes()
        expect(document.getElementById('telme-clarity')).toBeNull()

        await act(async () => screen.getByRole('button', { name: '온보딩 완료' }).click())

        expect(screen.getByText('고객 FAQ')).toBeInTheDocument()
        expect(document.querySelectorAll('#telme-clarity')).toHaveLength(1)
        expect(localStorage.getItem('telme-onboarded')).toBe('1')
    })

    it('관리자 직접 진입에서는 완료 기기도 SDK를 연결하지 않는다', () => {
        localStorage.setItem('telme-onboarded', '1')
        window.history.replaceState(null, '', '/admin/login')
        renderRoutes()

        expect(screen.getByText('관리자 로그인')).toBeInTheDocument()
        expect(document.getElementById('telme-clarity')).toBeNull()
        expect(window.clarity).toBeUndefined()
    })

    it('고객에서 관리자 이동 시 SDK 자동 재시작을 막고 고객 화면이 그려진 뒤 재개한다', async () => {
        localStorage.setItem('telme-onboarded', '1')
        window.history.replaceState(null, '', '/faq')
        renderRoutes()
        const observedStarts: string[] = []
        let active = true
        const sdk = Object.assign(vi.fn((method: unknown) => {
            if (method === 'stop') active = false
            if (method === 'start') {
                active = true
                observedStarts.push(document.body.textContent ?? '')
            }
        }), { v: '테스트 SDK' })
        window.clarity = sdk
        const guardedPush = window.history.pushState
        // 실제 SDK처럼 주소 변경 뒤 활성 상태이면 자동 재시작하는 대역이다.
        window.history.pushState = function (...args) {
            guardedPush.apply(this, args)
            if (active) sdk('start')
        }

        await act(async () => { await router?.navigate('/admin/login') })
        expect(screen.getByText('관리자 로그인')).toBeInTheDocument()
        expect(active).toBe(false)
        expect(observedStarts).toEqual([])

        await act(async () => { await router?.navigate('/faq') })
        expect(active).toBe(true)
        expect(observedStarts).toEqual(['고객 FAQ'])

        await act(async () => { await router?.navigate('/onboarding') })
        expect(active).toBe(false)
        expect(observedStarts).toEqual(['고객 FAQ'])

        const back = async () => {
            await act(async () => {
                const popped = new Promise<Event>((resolve) => {
                    window.addEventListener('popstate', resolve, { once: true })
                })
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
    })
})
