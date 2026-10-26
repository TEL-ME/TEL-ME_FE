import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { closeLoginSheet, useLoginSheet } from '../../auth/loginSheetStore'
import { GUEST_LIMIT_LOGIN_NOTE, liftGuestLimit, useGuestLimit } from '../guestLimitStore'
import GuestRemainingBanner from './GuestRemainingBanner'

describe('GuestRemainingBanner', () => {
  beforeEach(() => {
    liftGuestLimit()
    closeLoginSheet()
  })

  it('3회 이하로 남으면 남은 수와 로그인 버튼을 보여 준다', () => {
    useGuestLimit.setState({ remaining: 3 })
    render(<GuestRemainingBanner />)
    expect(screen.getByText('오늘 남은 질문 3회')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    expect(useLoginSheet.getState()).toMatchObject({ open: true, subtitle: GUEST_LIMIT_LOGIN_NOTE })
  })

  it('넉넉하거나(4회 이상) 모르거나(회원) 0이면(잠금 안내가 대신) 숨긴다', () => {
    for (const remaining of [4, null, 0]) {
      useGuestLimit.setState({ remaining })
      const { container, unmount } = render(<GuestRemainingBanner />)
      expect(container).toBeEmptyDOMElement()
      unmount()
    }
  })
})
