const KEY = 'telme-onboarded'

/** 시작하기를 한 번 본 기기인지 (기기에만 저장) */
export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return true
  }
}

export function markOnboarded() {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // 저장이 막힌 브라우저면 매번 보여도 괜찮다
  }
}
