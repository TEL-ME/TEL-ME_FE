import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import page from '../../index.html?raw'

let initClarity: typeof import('./clarity').initClarity
let stopClarity: typeof import('./clarity').stopClarity
let bindClarityNavigation: typeof import('./clarity').bindClarityNavigation
let unbindNavigation: (() => void) | undefined

let addedListeners: { mock: { calls: Parameters<Document['addEventListener']>[] } }

beforeEach(async () => {
    vi.resetModules()
    const clarity = await import('./clarity')
    initClarity = clarity.initClarity
    stopClarity = clarity.stopClarity
    bindClarityNavigation = clarity.bindClarityNavigation
    document.body.innerHTML = '<div id="root"></div>'
    window.history.replaceState(null, '', '/')
    localStorage.clear()
    localStorage.setItem('telme-onboarded', '1')
    document.getElementById('telme-clarity')?.remove()
    delete window.clarity
    vi.stubEnv('VITE_CLARITY_ENABLED', 'true')
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'testproject')
    vi.stubEnv('VITE_CLARITY_ENVIRONMENT', 'local')
    addedListeners = vi.spyOn(document, 'addEventListener')
})

afterEach(() => {
    unbindNavigation?.()
    unbindNavigation = undefined
    stopClarity()
    for (const [type, handler, options] of addedListeners.mock.calls) {
        if (type === 'click') document.removeEventListener(type, handler, options)
    }
    document.getElementById('telme-clarity')?.remove()
    delete window.clarity
    localStorage.clear()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
})

describe('클래리티 연결과 전송 범위', () => {
    it('첫 화면부터 본문 전체를 가린다', () => {
        expect(page).toContain('<div id="root" data-clarity-mask="true">')
        initClarity()
        expect(document.getElementById('root')).toHaveAttribute('data-clarity-mask', 'true')
    })

    it.each(['false', '', undefined])('명시적으로 켜지 않으면 외부 스크립트를 연결하지 않는다: %s', (value) => {
        vi.stubEnv('VITE_CLARITY_ENABLED', value)
        expect(initClarity()).toBe(false)
        expect(document.getElementById('telme-clarity')).toBeNull()
        expect(window.clarity).toBeUndefined()
    })

    it.each(['', 'https://example.invalid/private', '번호 010-0000-0000'])('잘못된 프로젝트 값은 연결하지 않는다: %s', (value) => {
        vi.stubEnv('VITE_CLARITY_PROJECT_ID', value)
        expect(initClarity()).toBe(false)
        expect(document.getElementById('telme-clarity')).toBeNull()
    })

    it('중복 초기화에도 외부 스크립트와 클릭 기록은 한 번만 연결한다', () => {
        expect(initClarity()).toBe(true)
        expect(initClarity()).toBe(true)
        const script = document.getElementById('telme-clarity') as HTMLScriptElement
        expect(script.src).toBe('https://www.clarity.ms/tag/testproject')
        expect(script.async).toBe(true)
        document.body.insertAdjacentHTML('beforeend', '<button data-clarity-action="consult_end_open">상담 종료</button>')
        document.querySelector('button')?.click()
        expect(window.clarity?.q).toEqual([
            ['set', 'environment', 'local'],
            ['event', 'consult_end_open'],
        ])
    })

    it('버튼 안쪽 요소를 눌러도 동작 이름만 보내고 합성 개인정보는 보내지 않는다', () => {
        initClarity()
        document.body.insertAdjacentHTML('beforeend', `
            <button data-clarity-action="consult_end_open"><span>합성 고객 beta@example.invalid</span></button>
        `)
        document.querySelector('button span')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        expect(window.clarity?.q?.at(-1)).toEqual(['event', 'consult_end_open'])
        expect(JSON.stringify(window.clarity?.q)).not.toContain('beta@example.invalid')
    })

    it('허용하지 않은 동작과 비활성 버튼은 사용자 문구를 이벤트로 보내지 않는다', () => {
        initClarity()
        document.body.insertAdjacentHTML('beforeend', `
            <button data-clarity-action="010-0000-0000">합성 번호</button>
            <button disabled data-clarity-action="consult_end_confirm">종료</button>
        `)
        document.querySelectorAll('button').forEach((button) => {
            button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        })
        expect(window.clarity?.q).toEqual([['set', 'environment', 'local']])
    })

    it.each(['summary_expand', 'summary_collapse'])('삭제된 요약 화면의 동작은 기록하지 않는다: %s', (action) => {
        initClarity()
        const button = document.createElement('button')
        button.setAttribute('data-clarity-action', action)
        document.body.appendChild(button)
        button.click()
        expect(window.clarity?.q).toEqual([['set', 'environment', 'local']])
    })

    it.each(['/', '/faq', '/auth/login'])('온보딩 완료 전에는 주소에 직접 들어와도 연결하지 않는다: %s', (path) => {
        localStorage.removeItem('telme-onboarded')
        window.history.replaceState(null, '', path)

        expect(initClarity()).toBe(false)
        expect(document.getElementById('telme-clarity')).toBeNull()
        expect(window.clarity).toBeUndefined()
    })

    it.each([
        '/admin', '/admin/login', '/admin/monitoring', '/ADMIN/faqs', '/%61dmin/faqs', '/onboarding',
    ])('온보딩 완료 기기도 제외 화면에서는 연결하지 않는다: %s', (path) => {
        window.history.replaceState(null, '', path)

        expect(initClarity()).toBe(false)
        expect(document.getElementById('telme-clarity')).toBeNull()
        expect(window.clarity).toBeUndefined()
    })

    it('완료 상태를 읽을 수 없는 브라우저에서는 수집하지 않는다', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('저장소 차단') })

        expect(initClarity()).toBe(false)
        expect(document.getElementById('telme-clarity')).toBeNull()
    })

    it('주소가 관리자 화면으로 바뀌기 전에 SDK를 중단한다', () => {
        unbindNavigation = bindClarityNavigation()
        initClarity()
        const stoppedPaths: string[] = []
        window.clarity = Object.assign(vi.fn((method: unknown) => {
            if (method === 'stop') stoppedPaths.push(window.location.pathname)
        }), { v: '테스트 SDK' })

        window.history.pushState(null, '', '/admin/monitoring')

        expect(stoppedPaths).toEqual(['/'])
        expect(initClarity()).toBe(false)
        document.body.insertAdjacentHTML('beforeend', '<button data-clarity-action="chat_new">관리자 버튼</button>')
        document.querySelector('button')?.click()
        expect(window.clarity).toHaveBeenCalledTimes(1)
    })

    it('SDK가 로딩되기 전 관리자로 이동하면 대기 중인 시작 요청도 지운다', () => {
        unbindNavigation = bindClarityNavigation()
        initClarity()
        const config = { projectId: 'testproject' }
        window.clarity?.('start', config)

        window.history.pushState(null, '', '/admin')

        expect(window.clarity?.q).toEqual([])
        window.clarity?.('start', config)
        expect(window.clarity?.q).toEqual([])
        expect(initClarity()).toBe(false)

        window.history.replaceState(null, '', '/faq')
        expect(initClarity()).toBe(true)
        expect(window.clarity?.q).toContainEqual(['start', config])
        expect(document.querySelectorAll('#telme-clarity')).toHaveLength(1)
    })

    it('뒤로 가기에서도 중단하고 재개할 때 클릭 기록을 중복 연결하지 않는다', () => {
        unbindNavigation = bindClarityNavigation()
        initClarity()
        const sdk = Object.assign(vi.fn(), { v: '테스트 SDK' })
        window.clarity = sdk

        window.dispatchEvent(new PopStateEvent('popstate'))
        expect(sdk).toHaveBeenCalledWith('stop')
        expect(initClarity()).toBe(true)
        expect(initClarity()).toBe(true)
        sdk.mockClear()
        document.body.insertAdjacentHTML('beforeend', '<button data-clarity-action="consult_end_open">상담 종료</button>')
        document.querySelector('button')?.click()
        expect(sdk.mock.calls).toEqual([['event', 'consult_end_open']])
    })

    it('수집 중 완료 표시가 없어지면 중단한다', () => {
        initClarity()
        const sdk = Object.assign(vi.fn(), { v: '테스트 SDK' })
        window.clarity = sdk
        localStorage.removeItem('telme-onboarded')

        expect(initClarity()).toBe(false)
        expect(sdk).toHaveBeenCalledWith('stop')
    })

    it('기능이 꺼져 있으면 브라우저의 주소 이동 처리도 바꾸지 않는다', () => {
        vi.stubEnv('VITE_CLARITY_ENABLED', 'false')
        const pushState = window.history.pushState
        const replaceState = window.history.replaceState

        unbindNavigation = bindClarityNavigation()

        expect(window.history.pushState).toBe(pushState)
        expect(window.history.replaceState).toBe(replaceState)
    })
})
