import { downsample, encodeWav, joinChunks, TARGET_RATE } from './wav'

type AudioContextCtor = typeof AudioContext

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ?? null
}

/** 이 브라우저에서 마이크 녹음을 할 수 있는지. 안 되면 마이크 버튼을 숨긴다 */
export function canRecord(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && audioContextCtor() != null
}

export interface Recording {
  /** 녹음을 끝내고 16kHz WAV와 길이(초)를 돌려준다 */
  stop: () => Promise<{ wav: Blob; seconds: number }>
  /** 녹음을 버린다 */
  cancel: () => void
}

/**
 * 마이크 녹음을 시작한다. 브라우저 기본 녹음(MediaRecorder)은 webm으로 나와 백엔드가 받지 못하므로
 * Web Audio로 PCM을 직접 모아 WAV로 만든다.
 * @param onLevel 0~1 소리 크기 (화면 막대용)
 */
export async function startRecording(onLevel: (level: number) => void): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  })
  const Ctor = audioContextCtor()!
  const ctx = new Ctor()
  const source = ctx.createMediaStreamSource(stream)
  // AudioWorklet은 모듈 파일이 따로 필요해 간단한 ScriptProcessor를 쓴다 (모든 주요 브라우저 지원)
  const processor = ctx.createScriptProcessor(4096, 1, 1)
  const chunks: Float32Array[] = []
  processor.onaudioprocess = (e) => {
    const data = e.inputBuffer.getChannelData(0)
    chunks.push(new Float32Array(data))
    let sum = 0
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i]
    onLevel(Math.min(1, Math.sqrt(sum / data.length) * 4))
  }
  source.connect(processor)
  // 일부 브라우저는 출력에 연결해야 onaudioprocess가 돈다. 출력은 0이라 소리는 나지 않는다
  processor.connect(ctx.destination)

  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    processor.onaudioprocess = null
    source.disconnect()
    processor.disconnect()
    stream.getTracks().forEach((t) => t.stop())
    void ctx.close()
  }

  return {
    stop: async () => {
      const rate = ctx.sampleRate
      close()
      const samples = downsample(joinChunks(chunks), rate)
      const outRate = rate > TARGET_RATE ? TARGET_RATE : rate
      return { wav: encodeWav(samples, outRate), seconds: samples.length / outRate }
    },
    cancel: close,
  }
}
