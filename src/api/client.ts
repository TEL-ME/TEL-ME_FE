import type { CustomResponse } from './types'

/** 개발 중에는 비워 두고 Vite 프록시(/api → 백엔드)를 쓴다. 배포 시 API 주소를 넣는다 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type QueryValue = string | number | boolean | null | undefined
/** 배열은 같은 이름을 반복해 보낸다 (예: serviceTypes=NEW_LINE&serviceTypes=PORT_IN) */
type Query = Record<string, QueryValue | readonly (string | number)[]>

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Query
  signal?: AbortSignal
}

export function apiUrl(path: string, query?: Query): string {
  const url = `${API_BASE_URL}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) value.forEach((v) => params.append(key, String(v)))
    else params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

/**
 * 백엔드 호출 공통 함수
 * - 세션 쿠키를 항상 같이 보낸다 (게스트 세션도 쿠키로 유지된다)
 * - CustomResponse를 벗겨 result만 돌려주고, 실패면 ApiError를 던진다
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal } = options
  const res = await fetch(apiUrl(path, query), {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })

  let payload: CustomResponse<T> | null
  try {
    payload = (await res.json()) as CustomResponse<T>
  } catch {
    payload = null
  }

  if (!res.ok || !payload || payload.isSuccess === false) {
    throw new ApiError(
      res.status,
      payload?.code ?? String(res.status),
      payload?.message ?? '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
    )
  }
  return payload.result
}
