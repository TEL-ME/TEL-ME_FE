import { reportServerError } from '../lib/sentry'
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
  // 파일(녹음 등)은 그대로 보내고, 나머지는 JSON으로 보낸다
  const isBlob = typeof Blob !== 'undefined' && body instanceof Blob
  const res = await fetch(apiUrl(path, query), {
    method,
    credentials: 'include',
    headers:
      body === undefined
        ? undefined
        : { 'Content-Type': isBlob ? (body as Blob).type || 'application/octet-stream' : 'application/json' },
    body: body === undefined ? undefined : isBlob ? (body as Blob) : JSON.stringify(body),
    signal,
  })

  const payload = await readPayload<T>(res)
  if (!res.ok || !payload || payload.isSuccess === false) throw toApiError(res, payload, method, path)
  return payload.result
}

async function readPayload<T>(res: Response): Promise<CustomResponse<T> | null> {
  try {
    return (await res.json()) as CustomResponse<T>
  } catch {
    return null
  }
}

function toApiError(res: Response, payload: CustomResponse<unknown> | null, method: string, path: string) {
  // 5xx만 Sentry로 보낸다 (본문·쿼리 없이 경로와 상태만)
  reportServerError(method, path, res.status, payload?.code)
  return new ApiError(
    res.status,
    payload?.code ?? String(res.status),
    payload?.message ?? '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
  )
}

/**
 * 파일을 받는 API (예: 답변 음성 mp3). 성공하면 Blob, 실패하면 다른 API와 같은 JSON 오류를 ApiError로 던진다
 */
export async function apiBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(apiUrl(path), { credentials: 'include', signal })
  const type = res.headers.get('Content-Type') ?? ''
  if (res.ok && !type.includes('json')) return res.blob()
  throw toApiError(res, await readPayload(res), 'GET', path)
}
