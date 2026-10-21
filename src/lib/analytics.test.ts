import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initAnalytics, track } from './analytics'

const SCRIPT = 'script#telme-ga'
const configCall = () =>
  window.dataLayer?.map((entry) => Array.from(entry as IArguments)).find((args) => args[0] === 'config')

beforeEach(() => {
  document.head.innerHTML = ''
  delete window.gtag
  delete window.dataLayer
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
    expect(configCall()).toEqual(['config', 'G-TEST123', {}])
  })

  it('VITE_GA_DEBUG=true일 때만 debug_mode를 켠다', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')
    vi.stubEnv('VITE_GA_DEBUG', 'true')
    initAnalytics()
    expect(configCall()?.[2]).toEqual({ debug_mode: true })
  })

  it('track은 이벤트 이름과 파라미터를 그대로 넘긴다', () => {
    const gtag = vi.fn()
    window.gtag = gtag
    track('plan_link_click', { label: '요금제 가입하러 가기' })
    expect(gtag).toHaveBeenCalledWith('event', 'plan_link_click', { label: '요금제 가입하러 가기' })
  })
})