import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ConfirmDialog from '../components/ConfirmDialog'
import { initClarity, stopClarity } from './clarity'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('고정 버튼의 가림 예외', () => {
  it('종료 확인창은 본문을 가리고 정해진 종료·취소 버튼만 보이게 한다', () => {
    render(
      <ConfirmDialog open title="합성 고객 문의" confirmLabel="종료" clarityScope="consultation-end"
        onConfirm={vi.fn()} onCancel={vi.fn()}>
        합성 전화번호 010-0000-0000
      </ConfirmDialog>,
    )
    expect(screen.getByRole('dialog')).toHaveAttribute('data-clarity-mask', 'true')
    expect(screen.getByText('합성 전화번호 010-0000-0000').closest('[data-clarity-unmask]')).toBeNull()
    expect(screen.getByRole('button', { name: '종료' })).toHaveAttribute('data-clarity-unmask', 'true')
    expect(screen.getByRole('button', { name: '취소' })).toHaveAttribute('data-clarity-action', 'consult_end_cancel')
  })

  it('다른 확인창이나 사용자에 따라 달라지는 버튼 문구는 가림을 풀지 않는다', () => {
    render(<ConfirmDialog open title="확인" confirmLabel="합성 고객 삭제" clarityScope="consultation-end"
      onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: '합성 고객 삭제' })).not.toHaveAttribute('data-clarity-unmask')
    expect(screen.getByRole('button', { name: '합성 고객 삭제' }))
      .toHaveAttribute('data-clarity-action', 'consult_end_confirm')
  })

  it('상담 종료 버튼 문구가 바뀌어도 동작 이름은 유지하고 미확인 문구는 가린다', () => {
    render(<ConfirmDialog open title="합성 고객 문의" confirmLabel="상담 끝내기" cancelLabel="계속 상담하기"
      clarityScope="consultation-end" onConfirm={vi.fn()} onCancel={vi.fn()} />)
    const confirm = screen.getByRole('button', { name: '상담 끝내기' })
    const cancel = screen.getByRole('button', { name: '계속 상담하기' })
    expect(confirm).toHaveAttribute('data-clarity-action', 'consult_end_confirm')
    expect(cancel).toHaveAttribute('data-clarity-action', 'consult_end_cancel')
    expect(confirm).not.toHaveAttribute('data-clarity-unmask')
    expect(cancel).not.toHaveAttribute('data-clarity-unmask')
    expect(screen.getByRole('dialog')).toHaveAttribute('data-clarity-mask', 'true')
  })

  it('상담 종료 범위가 없는 확인창에는 클릭 기록이나 가림 예외를 추가하지 않는다', () => {
    render(<ConfirmDialog open title="다른 업무 확인" confirmLabel="종료"
      onConfirm={vi.fn()} onCancel={vi.fn()} />)
    for (const button of screen.getAllByRole('button')) {
      expect(button).not.toHaveAttribute('data-clarity-action')
      expect(button).not.toHaveAttribute('data-clarity-unmask')
    }
  })

  it('바뀐 확인·취소 문구를 눌러도 정해진 동작만 SDK에 전달한다 — SDK 대역', () => {
    const previousFlag = localStorage.getItem('telme-onboarded')
    vi.stubEnv('VITE_CLARITY_ENABLED', 'true')
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'testproject')
    localStorage.setItem('telme-onboarded', '1')
    window.history.replaceState(null, '', '/faq')
    const sdk = Object.assign(vi.fn(), { v: '테스트 SDK' })
    try {
      initClarity()
      window.clarity = sdk
      render(<ConfirmDialog open title="합성 고객 문의" confirmLabel="상담 끝내기" cancelLabel="계속 상담하기"
        clarityScope="consultation-end" onConfirm={vi.fn()} onCancel={vi.fn()} />)
      screen.getByRole('button', { name: '계속 상담하기' }).click()
      screen.getByRole('button', { name: '상담 끝내기' }).click()
      expect(sdk.mock.calls).toEqual([
        ['event', 'consult_end_cancel'],
        ['event', 'consult_end_confirm'],
      ])
    } finally {
      stopClarity()
      delete window.clarity
      document.getElementById('telme-clarity')?.remove()
      if (previousFlag === null) localStorage.removeItem('telme-onboarded')
      else localStorage.setItem('telme-onboarded', previousFlag)
      vi.unstubAllEnvs()
    }
  })

})
