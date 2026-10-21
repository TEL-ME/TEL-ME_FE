import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDragScroll } from './useDragScroll'

function Row({ onPick }: { onPick: (k: string) => void }) {
  const drag = useDragScroll<HTMLDivElement>()
  return (
    <div {...drag} data-testid="row">
      <button type="button" onClick={() => onPick('a')}>칩 A</button>
    </div>
  )
}

// jsdom에는 PointerEvent가 없어 MouseEvent에 pointerType만 붙여 보낸다
function pointer(target: EventTarget, type: string, clientX: number, pointerType = 'mouse') {
  const ev = new MouseEvent(type, { bubbles: true, clientX, button: 0 })
  Object.defineProperty(ev, 'pointerType', { value: pointerType })
  act(() => {
    target.dispatchEvent(ev)
  })
}

function setup() {
  const onPick = vi.fn()
  render(<Row onPick={onPick} />)
  const row = screen.getByTestId('row')
  // jsdom은 scrollLeft를 기억하지 않아 일반 값으로 둔다
  Object.defineProperty(row, 'scrollLeft', { value: 100, writable: true })
  return { row, chip: screen.getByRole('button', { name: '칩 A' }), onPick }
}

describe('useDragScroll', () => {
  it('마우스로 끌면 가로로 넘기고, 끈 직후의 클릭은 칩을 누르지 않는다', () => {
    const { row, chip, onPick } = setup()
    pointer(chip, 'pointerdown', 200)
    pointer(window, 'pointermove', 140)
    expect(row.scrollLeft).toBe(160)
    pointer(window, 'pointerup', 140)
    act(() => chip.click())
    expect(onPick).not.toHaveBeenCalled()
  })

  it('조금만 움직였으면 평소처럼 클릭된다', () => {
    const { row, chip, onPick } = setup()
    pointer(chip, 'pointerdown', 200)
    pointer(window, 'pointermove', 198)
    pointer(window, 'pointerup', 198)
    act(() => chip.click())
    expect(onPick).toHaveBeenCalledWith('a')
    expect(row.scrollLeft).toBe(100)
  })

  it('터치는 브라우저 기본 스크롤에 맡긴다', () => {
    const { row, chip } = setup()
    pointer(chip, 'pointerdown', 200, 'touch')
    pointer(window, 'pointermove', 100, 'touch')
    expect(row.scrollLeft).toBe(100)
  })

  it('끈 뒤 칩 밖에서 손을 떼 클릭이 오지 않아도 다음 클릭은 막지 않는다', async () => {
    const { chip, onPick } = setup()
    pointer(chip, 'pointerdown', 200)
    pointer(window, 'pointermove', 100)
    pointer(window, 'pointerup', 100)
    await act(() => new Promise((r) => setTimeout(r, 0)))
    act(() => chip.click())
    expect(onPick).toHaveBeenCalledWith('a')
  })
})
