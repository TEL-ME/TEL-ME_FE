import type { EndSummaryInquiry } from '../../api/types'

/** 안내 문장은 서버가 "안내받은 내용: "을 붙여 줄 수 있다. 제목이 같은 말이라 화면에서는 뗀다 */
export const stripGuidance = (text: string) => text.replace(/^안내받은 내용\s*:\s*/, '')

/** 같은 제목의 문의는 한 문단으로 묶는다. 처음 나온 순서를 지키고, 똑같은 답변 문장은 한 번만 쓴다 */
export function groupInquiries(items: EndSummaryInquiry[]): { title: string; texts: string[] }[] {
  const groups = new Map<string, string[]>()
  for (const item of items) {
    const title = item.title.trim()
    const text = stripGuidance(item.text).trim()
    if (!title || !text) continue
    const texts = groups.get(title) ?? []
    if (!texts.includes(text)) texts.push(text)
    groups.set(title, texts)
  }
  return [...groups].map(([title, texts]) => ({ title, texts }))
}

