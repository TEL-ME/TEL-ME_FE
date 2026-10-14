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
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
