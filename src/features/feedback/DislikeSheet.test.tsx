import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import DislikeSheet from './DislikeSheet'
import { closeDislikeSheet, openDislikeSheet } from './feedbackActions'

describe('DislikeSheet', () => {
  afterEach(() => act(() => closeDislikeSheet()))

  it('기타를 고르면 의견을 써야 보낼 수 있다', async () => {
    const user = userEvent.setup()
    render(<DislikeSheet />)
    act(() => openDislikeSheet({ sessionId: 1, messageId: 10 }))

    await user.click(screen.getByRole('radio', { name: '기타' }))
    const send = screen.getByRole('button', { name: '보내기' })
    expect(send).toBeDisabled()
    expect(screen.getByText('(필수)')).toBeInTheDocument()

    // 공백만으로는 보낼 수 없다
    const box = screen.getByRole('textbox')
    await user.type(box, '   ')
    expect(send).toBeDisabled()

    await user.type(box, '원하는 답이 아니었어요')
    expect(send).toBeEnabled()
  })

  it('다른 사유는 의견 없이도 보낼 수 있다', async () => {
    const user = userEvent.setup()
    render(<DislikeSheet />)
    act(() => openDislikeSheet({ sessionId: 1, messageId: 11 }))

    await user.click(screen.getByRole('radio', { name: '이해하기 어려워요' }))
    expect(screen.getByRole('button', { name: '보내기' })).toBeEnabled()
    expect(screen.getByText('(선택)')).toBeInTheDocument()
  })
})
