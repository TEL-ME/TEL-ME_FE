import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ConfirmDialog from '../components/ConfirmDialog'

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
        expect(screen.getByRole('button', { name: '합성 고객 삭제' })).not.toHaveAttribute('data-clarity-action')
    })

})
