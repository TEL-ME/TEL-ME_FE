import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initAnalytics, syncAnalytics, track } from './analytics'

const SCRIPT = 'script#telme-ga'
const calls = () => window.dataLayer?.map((entry) => Array.from(entry as IArguments)) ?? []
const configCall = () => calls().find((args) => args[0] === 'config')
const pageViews = () => calls().filter((args) => args[0] === 'event' && args[1] === 'page_view')
const disabled = () => (window as unknown as Record<string, unknown>)['ga-disable-G-TEST123']

beforeEach(() => {
  document.head.innerHTML = ''
  delete window.gtag
  delete window.dataLayer
  localStorage.removeItem('telme-onboarded')
  delete (window as unknown as Record<string, unknown>)['ga-disable-G-TEST123']
})
afterEach(() => vi.unstubAllEnvs())

describe('GA 연결', () => {
  it('측정 ID가 없으면 연결하지 않고 track도 아무 일 없이 넘어간다', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', '')
    expect(initAnalytics()).toBe(false)
    expect(document.querySelector(SCRIPT)).toBeNull()
    expect(() => track('question_send')).not.toThrow()
  })

  it('G-로 시작하지 않는 ID는 연결하지 않는다', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'UA-12345')
    expect(initAnalytics()).toBe(false)
    expect(document.querySelector(SCRIPT)).toBeNull()
  })

  it('ID가 있으면 gtag.js를 한 번만 넣고 디버그 모드는 끈 채로 시작한다', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')
    expect(initAnalytics()).toBe(true)
    expect(initAnalytics()).toBe(true)
    expect(document.querySelectorAll(SCRIPT)).toHaveLength(1)
    expect(configCall()).toEqual(['config', 'G-TEST123', { send_page_view: false }])
  })

  it('VITE_GA_DEBUG=true일 때만 debug_mode를 켠다', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')
    vi.stubEnv('VITE_GA_DEBUG', 'true')
    initAnalytics()
    expect(configCall()?.[2]).toEqual({ send_page_view: false, debug_mode: true })
  })

  it('track은 이벤트 이름과 파라미터를 그대로 넘긴다', () => {
    const gtag = vi.fn()
    window.gtag = gtag
    track('plan_link_click', { label: '요금제 가입하러 가기' })
    expect(gtag).toHaveBeenCalledWith('event', 'plan_link_click', { label: '요금제 가입하러 가기' })
  })

  it('온보딩을 마치기 전에는 GA를 불러오지 않는다', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')
    syncAnalytics('/')
    expect(document.querySelector(SCRIPT)).toBeNull()
    expect(pageViews()).toHaveLength(0)
  })

  it('관리자 화면은 불러오지 않고, 사용자 화면에서 넘어가면 전송을 막는다', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')
    localStorage.setItem('telme-onboarded', '1')

    syncAnalytics('/admin/login')
    expect(document.querySelector(SCRIPT)).toBeNull()

    syncAnalytics('/chat/1')
    expect(disabled()).toBe(false)
    expect(pageViews()).toHaveLength(1)

    syncAnalytics('/admin/dashboard')
    expect(disabled()).toBe(true)
    expect(pageViews()).toHaveLength(1)

    syncAnalytics('/stores')
    expect(disabled()).toBe(false)
    expect(pageViews()).toHaveLength(2)
  })
})
