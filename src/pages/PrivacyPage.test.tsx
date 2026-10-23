import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import PrivacyPage from './PrivacyPage'

describe('PrivacyPage', () => {
  it('확인된 처리 항목·외부 서비스·보관 기준을 보여 준다', () => {
    render(
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: '개인정보처리방침' })).toBeInTheDocument()
    expect(screen.getByText('AI 상담과 상담 이력')).toBeInTheDocument()
    expect(screen.getByText('Amazon Bedrock')).toBeInTheDocument()
    expect(screen.getByText('30일 뒤 자동 삭제')).toBeInTheDocument()
    // 아직 정하지 않은 내용(자리표시)은 그대로 노출하지 않는다
    expect(screen.queryByText(/확인해야 할 내용/)).not.toBeInTheDocument()
  })
})
