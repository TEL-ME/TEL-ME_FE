import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { closeLoginSheet, useLoginSheet } from '../../auth/loginSheetStore'
import { GUEST_LIMIT_LOGIN_NOTE } from '../guestLimitStore'
import GuestLimitPanel from './GuestLimitPanel'

describe('GuestLimitPanel', () => {
  beforeEach(() => closeLoginSheet())

  it('입력창 자리에서 오늘 질문을 모두 썼다고 알리고, 로그인 시트를 연다', () => {
    render(<GuestLimitPanel />)
    expect(screen.getByText('오늘 비회원 질문을 모두 썼어요')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    expect(useLoginSheet.getState()).toMatchObject({ open: true, subtitle: GUEST_LIMIT_LOGIN_NOTE })
  })
})
