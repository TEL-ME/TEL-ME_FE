type Gtag = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
  }
}

const SCRIPT_ID = 'telme-ga'

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
  | 'logout'

/** 고정 문구·코드값만 넣는다. 질문·답변 원문, 좌표, 이메일·이름은 넣지 않는다 */
type AnalyticsParams = Record<string, string | number>

/**
 * GA4 사용자 행동 수집
 * - VITE_GA_MEASUREMENT_ID가 비었거나 형식이 다르면 아무것도 하지 않는다
 * - 화면 이동(page_view)은 GA 향상된 측정이 보낸다 (브라우저 기록 기반 페이지 변경)
 * - VITE_GA_DEBUG=true일 때만 DebugView에 보이도록 debug_mode를 켠다
 */
export function initAnalytics(): boolean {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim()
  if (!id || !/^G-[A-Z0-9]+$/.test(id)) return false
  if (document.getElementById(SCRIPT_ID)) return true

  const dataLayer = (window.dataLayer ??= [])
  // gtag.js는 arguments 객체만 명령으로 읽는다. 화살표 함수(배열)로 바꾸면 아무것도 수집되지 않는다
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params -- gtag.js는 arguments 객체만 명령으로 읽는다
    dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', id, import.meta.env.VITE_GA_DEBUG === 'true' ? { debug_mode: true } : {})

  const script = document.createElement('script')
  script.id = SCRIPT_ID
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
  document.head.appendChild(script)
  return true
}

/** GA가 꺼져 있으면(측정 ID 없음, 테스트 실행) 아무것도 하지 않는다 */
export function track(name: AnalyticsEvent, params?: AnalyticsParams) {
  window.gtag?.('event', name, params)
}