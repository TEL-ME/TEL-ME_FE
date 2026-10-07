/**
 * 다른 화면에서 고른 것을 상담 질문으로 넘긴다 (매장 안내의 "다른 지역으로 찾기" → 지역 선택 → 상담).
 * 주소에 싣지 않고 잠깐 들고 있다가, 그 대화 화면이 다시 열릴 때 한 번만 꺼내 보낸다.
 */
let pending: { path: string; question: string } | null = null

/** path: 질문을 보낼 대화 화면 주소 (예: /chat/12) */
export function handOffQuestion(path: string, question: string) {
  pending = { path, question }
}

/** 이 화면으로 넘어온 질문이 있으면 꺼낸다. 한 번 꺼내면 비워진다 */
export function takeHandedQuestion(path: string): string | null {
  if (pending?.path !== path) return null
  const { question } = pending
  pending = null
  return question
}

// 지역 이름만 보내면 매장 질문으로 알아듣지 못할 수 있어서 문장으로 만든다
export const regionStoreQuestion = (label: string) => `${label} 매장 찾아줘`
export const placeStoreQuestion = (label: string) => `${label} 근처 매장 찾아줘`
