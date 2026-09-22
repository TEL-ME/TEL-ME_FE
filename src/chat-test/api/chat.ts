import { parseResponse } from './response.mjs';

/** 로컬 백엔드 ChatSessionController 기준. SSE·피드백 호출은 별도 연결 예정. */
export async function chatRequest<T>(path: string, signal: AbortSignal, body?: object): Promise<T> {
  const response = await fetch('/api/v1/chat/sessions' + path, {
    method: body ? 'POST' : 'GET',
    credentials: 'include',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return await parseResponse(response) as T;
}
