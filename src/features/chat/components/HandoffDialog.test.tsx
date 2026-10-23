import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

async function renderWith(env: Record<string, string>) {
  vi.resetModules()
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v)
  const { default: HandoffDialog } = await import('./HandoffDialog')
  render(
    <MemoryRouter>
      <HandoffDialog open onClose={() => {}} />
    </MemoryRouter>,
  )
}

afterEach(() => vi.unstubAllEnvs())

describe('HandoffDialog', () => {
  it('기본값으로 고객센터 0000 · 24시간 상담과 전화 걸기, 매장·FAQ 안내를 보여 준다', async () => {
    await renderWith({ VITE_SUPPORT_PHONE: '', VITE_SUPPORT_HOURS: '' })
    expect(screen.getByRole('link', { name: /고객센터 0000/ })).toHaveAttribute('href', 'tel:0000')
    expect(screen.getByText('24시간 상담')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /가까운 매장 방문/ })).toHaveAttribute('href', '/stores')
    expect(screen.getByRole('link', { name: /자주 묻는 질문 보기/ })).toHaveAttribute('href', '/faq')
  })

  it('배포 변수로 번호·운영시간을 바꿀 수 있다', async () => {
    await renderWith({ VITE_SUPPORT_PHONE: '1544-0000', VITE_SUPPORT_HOURS: '평일 09:00~18:00' })
    expect(screen.getByRole('link', { name: /고객센터 1544-0000/ })).toHaveAttribute('href', 'tel:15440000')
    expect(screen.getByText('평일 09:00~18:00')).toBeInTheDocument()
  })
})
