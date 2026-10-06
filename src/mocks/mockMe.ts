/**
 * /auth/me가 백엔드에 생기기 전까지 MSW가 돌려줄 "지금 로그인한 사람"을 기록한다.
 * 이메일 로그인은 handlers.ts가 응답을 보고 기록하고, 카카오처럼 페이지를 떠났다 오는 로그인은 콜백 화면이 기록한다.
 * /auth/me가 생기면 이 파일과 호출부를 지운다.
 */
export const MOCK_ME_KEY = 'telme-mock-me'

export function recordMockLogin(user: { userId: number | null; email: string | null; name?: string | null }) {
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_MSW === 'false') return
  localStorage.setItem(MOCK_ME_KEY, JSON.stringify({ name: null, ...user, role: 'USER' }))
}
