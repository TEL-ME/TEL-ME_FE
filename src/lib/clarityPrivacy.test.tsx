import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ConfirmDialog from '../components/ConfirmDialog'
import EndSummaryCard from '../features/chat/components/EndSummaryCard'

vi.mock('../features/chat/endSummaryQueries', () => ({
    useEndSummary: () => ({
        isPending: false,
        isError: false,
        isFetching: false,
        data: {
            summaryStatus: 'COMPLETED',
            generatedAt: null,
            summary: {
                topics: [],
                guidance: [],
                pendingItems: [],
                inquiries: [{ title: '합성 고객 문의', text: '합성 이메일 beta@example.invalid 문의의 안내입니다.' }],
                remaining: [],
            },
        },
    }),
}))

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

    it('대역 응답의 요약 본문은 가리고 펼치기·접기의 고정 버튼만 보이게 한다', () => {
        // 화면 높이 측정만 대체한다. 외부 기록 서버와 실제 상담 모델은 호출하지 않는다.
        vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(220)
        vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(66)
        vi.stubGlobal('ResizeObserver', class {
            private callback: () => void
            constructor(callback: () => void) { this.callback = callback }
            observe() { this.callback() }
            disconnect() {}
        })
        render(<EndSummaryCard sessionId={1} />)
        expect(screen.getByRole('region', { name: '상담 요약' })).toHaveAttribute('data-clarity-mask', 'true')
        expect(screen.getByText('합성 이메일 beta@example.invalid 문의의 안내입니다.')
            .closest('[data-clarity-unmask]')).toBeNull()
        const expand = screen.getByRole('button', { name: '더 보기' })
        expect(expand).toHaveAttribute('data-clarity-unmask', 'true')
        expect(expand).toHaveAttribute('data-clarity-action', 'summary_expand')
        fireEvent.click(expand)
        const collapse = screen.getByRole('button', { name: '접기' })
        expect(collapse).toHaveAttribute('data-clarity-action', 'summary_collapse')
        fireEvent.click(collapse)
        expect(screen.getByRole('button', { name: '더 보기' })).toHaveAttribute('aria-expanded', 'false')
    })
})
