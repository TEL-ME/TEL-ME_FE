type Clarity = ((...args: unknown[]) => void) & { q?: unknown[][]; v?: string }

declare global {
  interface Window {
    clarity?: Clarity
  }
}

const SCRIPT_ID = 'telme-clarity'
const ONBOARDING_KEY = 'telme-onboarded'
let recordingRequested = false
let pendingStart: unknown[] | undefined
let initialQueue: Clarity | undefined
const ACTIONS = new Set([
  'consult_end_open',
  'consult_end_confirm',
  'consult_end_cancel',
  'chat_list_open',
  'chat_new',
  'nav_faq',
  'nav_stores',
  'nav_chat',
  'nav_my',
  'nav_settings',
])

export function canRecordClarity(pathname = window.location.pathname): boolean {
  try {
    const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID?.trim()
    const normalizedPath = decodeURIComponent(pathname).replace(/\/{2,}/g, '/')
    return import.meta.env.VITE_CLARITY_ENABLED === 'true'
      && !!projectId && /^[a-z0-9]{5,32}$/i.test(projectId)
      && !/^\/(admin|onboarding)(\/|$)/i.test(normalizedPath)
      && localStorage.getItem(ONBOARDING_KEY) === '1'
  } catch {
    // 저장소나 주소를 확인할 수 없으면 수집하지 않는다. 화면의 온보딩 처리 방식은 변경하지 않는다.
    return false
  }
}

/** 화면이 반영된 뒤 호출한다. 사용자 식별자나 상담 본문은 별도로 보내지 않는다. */
export function initClarity(): boolean {
  const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID?.trim()
  if (!canRecordClarity()) {
    stopClarity()
    return false
  }
  if (recordingRequested) return true

  // 외부 스크립트가 실행되기 전에 가림을 보장한다. 고정 문구만 각 요소에서 예외로 지정한다.
  document.getElementById('root')?.setAttribute('data-clarity-mask', 'true')
  recordingRequested = true
  if (!document.getElementById(SCRIPT_ID)) {
    const clarity: Clarity = (...args: unknown[]) => {
      if (args[0] === 'start') pendingStart = args.slice(1)
      // 느린 SDK가 관리자 화면에 도착한 뒤 초기화돼도 시작 요청을 보류한다.
      if (canRecordClarity() && recordingRequested) (clarity.q ??= []).push(args)
    }
    initialQueue = clarity
    window.clarity = clarity

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.async = true
    script.src = `https://www.clarity.ms/tag/${projectId}`
    document.head.appendChild(script)
  } else if (pendingStart) {
    window.clarity?.('start', ...pendingStart)
  } else if (window.clarity?.v) {
    window.clarity('start')
  }

  const environment = import.meta.env.VITE_CLARITY_ENVIRONMENT === 'beta' ? 'beta' : 'local'
  window.clarity?.('set', 'environment', environment)
  document.addEventListener('click', recordFixedAction, true)
  return true
}

export function stopClarity(): void {
  document.removeEventListener('click', recordFixedAction, true)
  const clarity = window.clarity
  if (clarity?.q) {
    // SDK 로딩 전의 시작 요청은 남기지 않는다. 재개에 필요한 설정만 메모리에 보관한다.
    const queuedStart = clarity.q.findLast((args) => args[0] === 'start')
    if (queuedStart) pendingStart = queuedStart.slice(1)
    clarity.q.length = 0
  } else if (recordingRequested) {
    clarity?.('stop')
  }
  recordingRequested = false
}

/**
 * 로컬에서 관찰한 SDK 0.8.72-beta와 공개 소스를 근거로 최초 로더 대기와 SDK 재시작 대기를 구분한다.
 * core/history.ts는 주소 변경 시 stop() 후 재시작을 예약한다(설정값 또는 기본 250ms, 실제 대기 상한 아님).
 * clarity.ts의 stop()은 queue.setup()으로 .v 없는 함수를 만들고, queue.ts의 process()가 .v를 다시 붙인다.
 * 수집 요청 중 최초 로더와 다른 .v 없는 함수를 재시작 대기로 추정한다. 공식 상태 API가 아니므로 SDK 변경 시 재확인한다.
 * 근거: https://github.com/microsoft/clarity/blob/master/packages/clarity-js/src/core/history.ts
 * https://github.com/microsoft/clarity/blob/master/packages/clarity-js/src/queue.ts
 */
export function isClarityRestartPending(): boolean {
  return recordingRequested && !!window.clarity && window.clarity !== initialQueue && !window.clarity.v
}

function recordFixedAction(event: MouseEvent) {
  if (!recordingRequested || !canRecordClarity()) return
  const target = event.target instanceof Element ? event.target.closest('[data-clarity-action]') : null
  if (!target || target.matches(':disabled') || target.getAttribute('aria-disabled') === 'true') return
  const action = target.getAttribute('data-clarity-action')
  // 화면 문구·입력·주소를 이벤트 이름으로 쓰지 않고 정해 둔 동작만 기록한다.
  if (action && ACTIONS.has(action)) window.clarity?.('event', action)
}
