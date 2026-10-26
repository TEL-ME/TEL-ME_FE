import type { DislikeReason } from '../../api/types'

/**
 * 싫어요 사유와 화면 이름. 사용자 시트·관리자 피드백 목록·대시보드가 함께 쓴다 (사유가 늘면 여기만 고친다)
 * OTHER(기타)는 의견이 필수다 (백엔드 TELME-136)
 */
export const DISLIKE_REASONS: { code: DislikeReason; label: string }[] = [
  { code: 'WRONG_INFO', label: '정보가 정확하지 않아요' },
  { code: 'NOT_RELATED', label: '질문과 관련이 없어요' },
  { code: 'HARD_TO_READ', label: '이해하기 어려워요' },
  { code: 'OTHER', label: '기타' },
]

export const dislikeReasonLabel = (code: string) => DISLIKE_REASONS.find((r) => r.code === code)?.label ?? code

/** 의견을 꼭 남겨야 하는 사유 */
export const needsComment = (code: DislikeReason | null) => code === 'OTHER'
