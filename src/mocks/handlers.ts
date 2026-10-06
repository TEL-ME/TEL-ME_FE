import type { RequestHandler } from 'msw'

/**
 * 백엔드에 아직 없는 API만 가짜로 응답한다. 여기 없는 요청은 그대로 백엔드(프록시)로 간다.
 * 백엔드에 API가 생기면 해당 핸들러를 지운다.
 * (지금은 비어 있음 — /auth/me가 백엔드에 생겨서 가짜 응답을 모두 걷어냈다)
 */
export const handlers: RequestHandler[] = []
