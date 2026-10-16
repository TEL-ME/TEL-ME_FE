import { api, apiBlob } from './client'

/** 음성 API (TELME-155). 인식 결과는 입력창에 채우기만 하고, 전송은 기존 메시지 API로 한다 */
export const speechApi = {
  /** 녹음한 WAV(모노·16bit PCM, 최대 30초)를 문장으로 바꾼다 */
  transcribe: (wav: Blob, signal?: AbortSignal) =>
    api<{ text: string }>('/api/v1/chat/speech/transcriptions', { method: 'POST', body: wav, signal }),
  /** 완료된 챗봇 답변을 mp3로 받는다 */
  messageSpeech: (messageId: number, signal?: AbortSignal) => apiBlob(`/api/v1/chat/messages/${messageId}/speech`, signal),
}
