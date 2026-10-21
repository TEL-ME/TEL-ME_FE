type Gtag = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
  }
}

const SCRIPT_ID = 'telme-ga'
const ONBOARDING_KEY = 'telme-onboarded'

/** 보낼 수 있는 이벤트. 새 이벤트는 여기에 먼저 추가한다 */
export type AnalyticsEvent =
  | 'consult_start'
  | 'question_send'
  | 'faq_source_open'
  | 'plan_link_click'
  | 'consult_end_open'
  | 'consult_end_confirm'
  | 'consult_end_success'
  | 'login'
  | 'sign_up'
  | 'logout'

/** 고정 문구·코드값만 넣는다. 질문·답변 원문, 좌표, 이메일·이름은 넣지 않는다 */
type AnalyticsParams = Record<string, string | number>

function measurementId(): string | null {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim()
  return id && /^G-[A-Z0-9]+$/.test(id) ? id : null
}

/** Clarity(canRecordClarity)와 같은 기준: 관리자·온보딩 화면 제외, 온보딩을 마친 기기만 */
function canTrack(path: string): boolean {
  try {
    const pathname = decodeURIComponent(path.split('?')[0]).replace(/\/{2,}/g, '/')
    return !/^\/(admin|onboarding)(\/|$)/i.test(pathname) && localStorage.getItem(ONBOARDING_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * GA4 사용자 행동 수집
 * - VITE_GA_MEASUREMENT_ID가 비었거나 형식이 다르면 아무것도 하지 않는다
 * - 화면 조회(page_view)는 GA 자동 전송을 끄고 syncAnalytics가 직접 보낸다 (관리자 화면을 빼기 위해)
 * - VITE_GA_DEBUG=true일 때만 DebugView에 보이도록 debug_mode를 켠다
 */
export function initAnalytics(): boolean {
  const id = measurementId()
  if (!id) return false
  if (document.getElementById(SCRIPT_ID)) return true

  const dataLayer = (window.dataLayer ??= [])
  // gtag.js는 arguments 객체만 명령으로 읽는다. 화살표 함수(배열)로 바꾸면 아무것도 수집되지 않는다
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params -- gtag.js는 arguments 객체만 명령으로 읽는다
    dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', id, {
    send_page_view: false,
    ...(import.meta.env.VITE_GA_DEBUG === 'true' ? { debug_mode: true } : {}),
  })

  const script = document.createElement('script')
  script.id = SCRIPT_ID
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
  document.head.appendChild(script)
  return true
}

/**
 * 화면이 바뀔 때마다 부른다. 수집 기준은 canTrack (Clarity와 같음)
 * - 온보딩(이용약관·개인정보처리방침 동의)을 마친 기기에서만 수집한다
 * - 관리자(/admin)·온보딩(/onboarding) 화면은 수집하지 않는다. 그동안 gtag.js가 아무것도 보내지 않게 막는다
 */
export function syncAnalytics(path: string) {
  const id = measurementId()
  if (!id) return
  const off = !canTrack(path)
  ;(window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = off
  if (off || !initAnalytics()) return
  window.gtag?.('event', 'page_view', { page_location: window.location.origin + path, page_title: document.title })
}

/** GA가 꺼져 있으면(측정 ID 없음, 테스트 실행) 아무것도 하지 않는다 */
export function track(name: AnalyticsEvent, params?: AnalyticsParams) {
  window.gtag?.('event', name, params)
}
