import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import page from '../../index.html?raw'
import { initClarity } from './clarity'

let addedListeners: { mock: { calls: Parameters<Document['addEventListener']>[] } }

beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
    document.getElementById('telme-clarity')?.remove()
    delete window.clarity
    vi.stubEnv('VITE_CLARITY_ENABLED', 'true')
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'testproject')
    vi.stubEnv('VITE_CLARITY_ENVIRONMENT', 'local')
    addedListeners = vi.spyOn(document, 'addEventListener')
})

afterEach(() => {
    for (const [type, handler, options] of addedListeners.mock.calls) {
        if (type === 'click') document.removeEventListener(type, handler, options)
    }
    document.getElementById('telme-clarity')?.remove()
    delete window.clarity
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
})
