import { ApiError } from '../../api/client'

const COMMON: Record<string, string> = {
  'SPEECH429-0': '음성 요청이 많아요. 잠시 후 다시 해 주세요',
}

/** 음성 질문(인식) 실패 안내 */
export function transcribeErrorMessage(e: unknown): string {
  const code = e instanceof ApiError ? e.code : ''
  const map: Record<string, string> = {
    ...COMMON,
    'SPEECH400-1': '녹음을 읽지 못했어요. 다시 말해 주세요',
    'SPEECH400-2': '너무 짧거나 길어요. 30초 안으로 다시 말해 주세요',
    'SPEECH422-0': '잘 못 알아들었어요. 다시 말해 주세요',
    'SPEECH429-1': '오늘 쓸 수 있는 음성 질문을 모두 썼어요. 글로 물어봐 주세요',
  }
  return map[code] ?? '음성을 알아듣지 못했어요. 잠시 후 다시 해 주세요'
}

/** 답변 듣기 실패 안내 */
export function speechErrorMessage(e: unknown): string {
  const code = e instanceof ApiError ? e.code : ''
  const map: Record<string, string> = {
    ...COMMON,
    'SPEECH400-0': '이 답변은 음성으로 들려드릴 수 없어요',
    'SPEECH429-1': '오늘 쓸 수 있는 음성 듣기를 모두 썼어요',
  }
  return map[code] ?? '음성을 불러오지 못했어요'
}

/** 마이크를 열지 못했을 때 */
export function micErrorMessage(e: unknown): string {
  const name = e instanceof DOMException ? e.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return '마이크를 쓰려면 브라우저 설정에서 허용해 주세요'
  if (name === 'NotFoundError') return '연결된 마이크를 찾지 못했어요'
  return '마이크를 켜지 못했어요'
}
