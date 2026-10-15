import type { RequestHandler } from 'msw'
import { usageHandlers } from './usage'

/**
 * 백엔드에 아직 없는 API만 가짜로 응답한다. 여기 없는 요청은 그대로 백엔드(프록시)로 간다.
 * 백엔드에 API가 생기면 해당 핸들러를 지운다.
 * - VITE_MOCK_USAGE=true: 사용량(/usage/me)을 최근 6개월 더미로 (지난 달 화면 확인용)
 */
export const handlers: RequestHandler[] = [...(import.meta.env.VITE_MOCK_USAGE === 'true' ? usageHandlers : [])]
