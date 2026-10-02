import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// globals를 켜지 않아 자동 정리가 안 되므로, 테스트마다 그린 화면을 직접 지운다
afterEach(() => {
  cleanup()
})
