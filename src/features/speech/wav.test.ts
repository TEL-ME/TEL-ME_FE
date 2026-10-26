import { describe, expect, it } from 'vitest'
import { downsample, encodeWav, joinChunks } from './wav'

describe('wav', () => {
  it('48kHz를 16kHz로 줄이면 길이가 1/3이 된다', () => {
    expect(downsample(new Float32Array(4800), 48000).length).toBe(1600)
    // 이미 낮으면 그대로
    const low = new Float32Array(10)
    expect(downsample(low, 16000)).toBe(low)
  })

  it('조각을 순서대로 잇는다', () => {
    const out = joinChunks([new Float32Array([1, 2]), new Float32Array([3])])
    expect([...out]).toEqual([1, 2, 3])
  })

  it('모노 16bit PCM WAV 헤더를 쓴다', async () => {
    const blob = encodeWav(new Float32Array([0, 1, -1]), 16000)
    expect(blob.type).toBe('audio/wav')
    const view = new DataView(await blob.arrayBuffer())
    const text = (at: number) => String.fromCharCode(...[0, 1, 2, 3].map((i) => view.getUint8(at + i)))
    expect(text(0)).toBe('RIFF')
    expect(text(8)).toBe('WAVE')
    expect(view.getUint16(20, true)).toBe(1) // PCM
    expect(view.getUint16(22, true)).toBe(1) // 모노
    expect(view.getUint32(24, true)).toBe(16000)
    expect(view.getUint16(34, true)).toBe(16) // 16bit
    expect(view.getUint32(40, true)).toBe(6)
    expect(view.getInt16(46, true)).toBe(0x7fff)
    expect(view.getInt16(48, true)).toBe(-0x8000)
  })
})
