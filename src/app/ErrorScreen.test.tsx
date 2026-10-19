import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const captureException = vi.hoisted(() => vi.fn())
vi.mock('@sentry/react', () => ({ captureException }))

import { RouteErrorScreen } from './ErrorScreen'

function Boom(): never {
  throw new Error('render-fail')
}

beforeEach(() => {
  captureException.mockClear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('라우터 errorElement', () => {
  it('화면 오류가 나면 안내 화면을 보여 주고 Sentry로 보낸다', async () => {
    const router = createMemoryRouter([{ errorElement: <RouteErrorScreen />, children: [{ path: '/', element: <Boom /> }] }])
    render(<RouterProvider router={router} />)
    expect(await screen.findByText('화면을 불러오지 못했어요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 불러오기' })).toBeInTheDocument()
    expect(captureException).toHaveBeenCalledWith(expect.objectContaining({ message: 'render-fail' }), expect.anything())
  })

  it('라우터의 응답 오류(404 등)는 보내지 않는다', async () => {
    const router = createMemoryRouter([{ errorElement: <RouteErrorScreen />, children: [{ path: '/', element: <div /> }] }], {
      initialEntries: ['/nope'],
    })
    render(<RouterProvider router={router} />)
    expect(await screen.findByText('화면을 불러오지 못했어요')).toBeInTheDocument()
    expect(captureException).not.toHaveBeenCalled()
  })
})
