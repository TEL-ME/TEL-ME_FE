type Clarity = ((...args: unknown[]) => void) & { q?: unknown[][] }

declare global {
    interface Window {
        clarity?: Clarity
    }
}

const SCRIPT_ID = 'telme-clarity'
const ACTIONS = new Set([
    'consult_end_open',
    'consult_end_confirm',
    'consult_end_cancel',
    'summary_expand',
    'summary_collapse',
    'chat_list_open',
    'chat_new',
    'nav_faq',
    'nav_stores',
    'nav_chat',
    'nav_my',
    'nav_settings',
])

/** 설정을 명시적으로 켠 환경에서만 연결한다. 사용자 식별자나 상담 본문은 별도로 보내지 않는다. */
export function initClarity(): boolean {
    const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID?.trim()
    if (import.meta.env.VITE_CLARITY_ENABLED !== 'true' || !projectId || !/^[a-z0-9]{5,32}$/i.test(projectId)) {
        return false
    }
    if (document.getElementById(SCRIPT_ID)) return true

    // 외부 스크립트가 실행되기 전에 가림을 보장한다. 고정 문구만 각 요소에서 예외로 지정한다.
    document.getElementById('root')?.setAttribute('data-clarity-mask', 'true')
    const clarity: Clarity = window.clarity ?? ((...args: unknown[]) => {
        (clarity.q ??= []).push(args)
    })
    window.clarity = clarity

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.async = true
    script.src = `https://www.clarity.ms/tag/${projectId}`
    document.head.appendChild(script)

    const environment = import.meta.env.VITE_CLARITY_ENVIRONMENT === 'beta' ? 'beta' : 'local'
    clarity('set', 'environment', environment)
    document.addEventListener('click', recordFixedAction, true)
    return true
}

function recordFixedAction(event: MouseEvent) {
    const target = event.target instanceof Element ? event.target.closest('[data-clarity-action]') : null
    if (!target || target.matches(':disabled') || target.getAttribute('aria-disabled') === 'true') return
    const action = target.getAttribute('data-clarity-action')
    // 화면 문구·입력·주소를 이벤트 이름으로 쓰지 않고 정해 둔 동작만 기록한다.
    if (action && ACTIONS.has(action)) window.clarity?.('event', action)
}
