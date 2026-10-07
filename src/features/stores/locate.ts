import type { LatLng } from './format'

export type LocateFailure = 'unsupported' | 'denied' | 'failed'

/** 현재 위치를 받지 못한 이유 */
export class LocateError extends Error {
  readonly reason: LocateFailure

  constructor(reason: LocateFailure) {
    super(reason)
    this.name = 'LocateError'
    this.reason = reason
  }
}

export const canLocate = () => 'geolocation' in navigator

/**
 * 현재 위치를 한 번 받는다. 처음이면 브라우저가 위치 권한을 묻는다.
 * 실패하면 LocateError(reason)를 던진다.
 */
export function locateMe(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!canLocate()) return reject(new LocateError('unsupported'))
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new LocateError(err.code === err.PERMISSION_DENIED ? 'denied' : 'failed')),
      { timeout: 10_000, maximumAge: 60_000 },
    )
  })
}

/** 화면에 띄울 안내 문구. denied일 때 무엇을 대신 하라고 할지는 화면마다 달라서 받는다 */
export function locateErrorMessage(error: unknown, whenDenied: string): string {
  const reason = error instanceof LocateError ? error.reason : 'failed'
  if (reason === 'unsupported') return '이 브라우저에서는 현재 위치를 쓸 수 없어요'
  if (reason === 'denied') return whenDenied
  return '현재 위치를 찾지 못했어요. 잠시 후 다시 시도해 주세요'
}
