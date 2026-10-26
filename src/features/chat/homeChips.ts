/** 상담 홈 "무엇이든 물어바라!" 추천 질문 (question이 있으면 누를 때 그 문장으로 보낸다) */
export const HOME_CHIPS = [
  { tag: '요금제', label: '나에게 맞는 요금제 찾기', tone: 'plan' },
  { tag: '매장', label: '가까운 매장 알아보기', tone: 'store' },
  { tag: '유심', label: '유심을 잃어버렸어요', tone: 'usim' },
  { tag: '로밍', label: '해외에서 데이터 쓰기', tone: 'roam', question: '해외에서 데이터 쓰려면 어떻게 해요?' },
] as const

export type ChipTone = (typeof HOME_CHIPS)[number]['tone']

/** Tailwind가 클래스를 찾을 수 있게 전체 이름으로 적는다 */
export const CHIP_CLASS: Record<ChipTone, string> = {
  plan: 'bg-chip-plan-bg text-chip-plan',
  store: 'bg-chip-store-bg text-chip-store',
  usim: 'bg-chip-usim-bg text-chip-usim',
  roam: 'bg-chip-roam-bg text-chip-roam',
}
