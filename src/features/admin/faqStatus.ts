import type { FaqStatus } from '../../api/admin'

export const FAQ_STATUS_LABEL: Record<FaqStatus, string> = { ACTIVE: '사용 중', HIDDEN: '숨김', DELETED: '삭제됨' }
export const faqStatusTone = (s: FaqStatus) => (s === 'ACTIVE' ? 'success' : s === 'HIDDEN' ? 'muted' : 'danger') as 'success' | 'muted' | 'danger'
