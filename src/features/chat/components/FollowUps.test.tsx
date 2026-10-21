import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../api/plans', () => ({ planApi: { list: () => Promise.resolve([]) } }))

const { default: FollowUps } = await import('./FollowUps')

function PlanSelect() {
  return <p>요금제 고르기 화면{useLocation().search}</p>
}

function renderAt(items: string[], onAsk = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  // 요금제 목록은 이미 읽어 둔 것으로 둔다 (useAllPlans와 같은 키)
  client.setQueryData(['plans', null, null], [
    { planId: 7, name: '5G 스탠다드' },
    { planId: 9, name: '5G 언리미티드' },
  ])
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/chat']}>
        <Routes>
          <Route path="/chat" element={<FollowUps items={items} disabled={false} onAsk={onAsk} />} />
          <Route path="/my/plan/select" element={<PlanSelect />} />
          <Route path="/my/plan" element={<p>내 요금제 화면</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
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

  it('요금제 이름이 붙은 링크는 그 요금제를 고른 채로 고르기 화면을 연다', () => {
    const onAsk = renderAt(['5G 스탠다드 변경하러 가기'])
    fireEvent.click(screen.getByRole('button', { name: /5G 스탠다드 변경하러 가기/ }))
    expect(onAsk).not.toHaveBeenCalled()
    expect(screen.getByText('요금제 고르기 화면?planId=7')).toBeInTheDocument()
  })

  it('이름으로 요금제를 찾지 못하면 고르기 화면만 연다', () => {
    renderAt(['없는 요금제 가입하러 가기'])
    fireEvent.click(screen.getByRole('button', { name: /없는 요금제 가입하러 가기/ }))
    expect(screen.getByText('요금제 고르기 화면')).toBeInTheDocument()
  })
})
