import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom에는 스크롤 API가 없다. 화면이 타이머로 scrollTo를 부를 때 테스트가 끝난 뒤 늦게 실행되면
// "scrollTo is not a function"으로 전체 검사가 실패하므로, 없을 때만 아무것도 하지 않는 함수로 채운다
if (typeof Element.prototype.scrollTo !== 'function') {
  Element.prototype.scrollTo = () => {}
}

// globals를 켜지 않아 자동 정리가 안 되므로, 테스트마다 그린 화면을 직접 지운다
afterEach(() => {
  cleanup()
})
