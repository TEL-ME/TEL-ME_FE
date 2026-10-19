import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import FollowUps from './FollowUps'

function renderAt(items: string[], onAsk = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/chat']}>
      <Routes>
        <Route path="/chat" element={<FollowUps items={items} disabled={false} onAsk={onAsk} />} />
        <Route path="/my/plan/select" element={<p>요금제 고르기 화면</p>} />
        <Route path="/my/plan" element={<p>내 요금제 화면</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return onAsk
}

describe('FollowUps 요금제 업무 링크', () => {
  it('링크 문구는 채팅으로 보내지 않고 처리 화면으로 이동한다', () => {
    const onAsk = renderAt(['요금제 변경하러 가기'])
    fireEvent.click(screen.getByRole('button', { name: '요금제 변경하러 가기' }))
    expect(onAsk).not.toHaveBeenCalled()
    expect(screen.getByText('요금제 고르기 화면')).toBeInTheDocument()
  })

  it('해지 링크는 내 요금제 화면으로 간다', () => {
    renderAt(['해지하러 가기'])
    fireEvent.click(screen.getByRole('button', { name: '해지하러 가기' }))
    expect(screen.getByText('내 요금제 화면')).toBeInTheDocument()
  })

  it('추천 질문 3개 제한에 링크는 세지 않는다', () => {
    renderAt(['질문 1', '질문 2', '질문 3', '요금제 변경하러 가기'])
    expect(screen.getAllByRole('button')).toHaveLength(4)
  })

  it('일반 추천 질문은 그대로 채팅으로 보낸다', () => {
    const onAsk = renderAt(['요금제 종류 알려줘'])
    fireEvent.click(screen.getByRole('button', { name: '요금제 종류 알려줘' }))
    expect(onAsk).toHaveBeenCalledWith('요금제 종류 알려줘')
  })
})
