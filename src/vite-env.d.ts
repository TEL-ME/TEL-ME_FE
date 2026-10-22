/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_PROXY_TARGET?: string
  readonly VITE_ENABLE_MSW?: string
  /** true면 사용량을 최근 6개월 더미로 응답 (src/mocks/usage.ts) */
  readonly VITE_MOCK_USAGE?: string
  readonly VITE_RETRY_API?: string
  readonly VITE_CHAT_GPS?: string
  readonly VITE_KAKAO_MAP_KEY?: string
  /** Sentry 프로젝트 DSN. 비우면 오류 수집을 하지 않는다 */
  readonly VITE_SENTRY_DSN?: string
  /** Sentry에서 구분할 환경 이름 (local / beta) */
  readonly VITE_SENTRY_ENVIRONMENT?: string
  /** 클래리티는 명시적으로 켠 환경에서만 수집한다. 설정 변경 후 다시 빌드해야 한다. */
  readonly VITE_CLARITY_ENABLED?: string
  readonly VITE_CLARITY_PROJECT_ID?: string
  readonly VITE_CLARITY_ENVIRONMENT?: 'local' | 'beta'
  /** GA4 측정 ID(G-로 시작). 비우면 사용자 행동을 수집하지 않는다 */
  readonly VITE_GA_MEASUREMENT_ID?: string
  /** true면 GA DebugView에 보이도록 debug_mode를 켠다 (로컬 확인용, 배포에서는 비움) */
  readonly VITE_GA_DEBUG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
