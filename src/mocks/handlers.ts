import { bypass, http, HttpResponse } from 'msw'
import { MOCK_ME_KEY } from './mockMe'

/**
 * 백엔드에 아직 없는 API만 가짜로 응답한다. 여기 없는 요청은 그대로 백엔드(프록시)로 간다.
 * 백엔드에 API가 생기면 해당 핸들러를 지운다.
 */
const ok = <T,>(result: T) => HttpResponse.json({ isSuccess: true, code: '200', message: 'OK', result })

// /auth/me가 생기기 전까지, 실제 로그인·가입·로그아웃 결과를 여기에 적어 두고 /me가 돌려준다
const ME_KEY = MOCK_ME_KEY
const GUEST = { userId: null, email: null, name: null, role: 'GUEST' }

const readMe = () => {
  try {
    return JSON.parse(localStorage.getItem(ME_KEY) ?? 'null') ?? GUEST
  } catch {
    return GUEST
  }
}

// 이메일별로 가입 때 입력한 이름을 기억해 둔다 (로그인 응답에는 이름이 없어서)
const NAMES_KEY = 'telme-mock-names'
const readNames = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(NAMES_KEY) ?? '{}')
  } catch {
    return {}
  }
}

/** 실제 백엔드로 보내고, 성공하면 로그인한 사람을 기록한다 */
const recordLogin = async ({ request }: { request: Request }) => {
  const sent = await request.clone().json().catch(() => null)
  const res = await fetch(bypass(request))
  const body = await res.clone().json().catch(() => null)
  if (res.ok && body?.isSuccess && body.result?.userId) {
    const email: string = body.result.email
    const names = readNames()
    if (typeof sent?.name === 'string' && sent.name.trim()) {
      names[email] = sent.name.trim()
      localStorage.setItem(NAMES_KEY, JSON.stringify(names))
    }
    localStorage.setItem(
      ME_KEY,
      JSON.stringify({ userId: body.result.userId, email, name: names[email] ?? null, role: 'USER' }),
    )
  }
  return res
}

export const handlers = [
  // GET /api/v1/auth/me — 요청 예정 (role 포함)
  http.get('*/api/v1/auth/me', () => ok(readMe())),

  http.post('*/api/v1/auth/login', recordLogin),
  http.post('*/api/v1/auth/signup', recordLogin),
  http.post('*/api/v1/auth/logout', async ({ request }) => {
    const res = await fetch(bypass(request))
    localStorage.removeItem(ME_KEY)
    return res
  }),
]
