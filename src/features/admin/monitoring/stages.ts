import type { MonitoringStatus, StageKey, StageState } from '../../../api/adminMonitoring'

/** 표의 칸 7개 (순서대로) */
export const STAGE_COLUMNS: { key: StageKey; label: string }[] = [
  { key: 'inputCheck', label: '입력 검사' },
  { key: 'routing', label: '라우팅' },
  { key: 'search', label: '검색' },
  { key: 'judgment', label: '판정' },
  { key: 'generation', label: '생성' },
  { key: 'outputCheck', label: '출력 검사' },
  { key: 'result', label: '결과' },
]

/** 칸 색 (기획 시안: 통과 초록 · 일부 노랑 · 실패 빨강 · 안 함 회색 · 진행 중 파랑) */
export const STATE_STYLE: Record<StageState, { name: string; dot: string; cell: string }> = {
  PASSED: { name: '통과', dot: 'bg-[#2f9e6f]', cell: 'bg-[#e6f5ee] text-[#1c6e4c] dark:bg-[#173a2c] dark:text-[#8fdcb8]' },
  PARTIAL: { name: '일부', dot: 'bg-[#e0a10b]', cell: 'bg-[#fdf3d8] text-[#8a5a00] dark:bg-[#3a2f12] dark:text-[#f2cd6b]' },
  FAILED: { name: '실패', dot: 'bg-[#d64545]', cell: 'bg-[#fde8e8] text-[#a82a2a] dark:bg-[#3d1c1f] dark:text-[#ff9b9b]' },
  SKIPPED: { name: '안 함', dot: 'bg-[#c9c4cc] dark:bg-[#5a5560]', cell: 'bg-surface-2 text-ink-muted' },
  RUNNING: { name: '진행 중', dot: 'bg-[#3b7ddd]', cell: 'bg-[#e6effc] text-[#2457a3] dark:bg-[#1b2e47] dark:text-[#96bff0]' },
}

/** 모르는 state가 와도 회색으로 */
export const stateStyle = (state: string) => STATE_STYLE[state as StageState] ?? STATE_STYLE.SKIPPED

export const STATUS_FILTERS: [MonitoringStatus | null, string][] = [
  [null, '전체'],
  ['RUNNING', '진행 중'],
  ['COMPLETED', '완료'],
  ['FAILED', '실패'],
  ['CANCELLED', '취소'],
  ['BLOCKED', '차단'],
]

export const STATUS_BADGE: Record<MonitoringStatus, { label: string; tone: 'brand' | 'muted' | 'success' | 'notice' | 'danger' }> = {
  RUNNING: { label: '진행 중', tone: 'notice' },
  COMPLETED: { label: '완료', tone: 'success' },
  FAILED: { label: '실패', tone: 'danger' },
  CANCELLED: { label: '취소', tone: 'muted' },
  BLOCKED: { label: '차단', tone: 'brand' },
}

/** 내부 단계 이름 → 화면 이름. 모르는 이름은 그대로 */
const TIMELINE_NAMES: Record<string, string> = {
  processing: '처리 시작',
  questionResolutionMode: '문맥 복원',
  questionResolution: '문맥 복원',
  analysis: '분석·라우팅',
  searchRequests: '검색 요청',
  refinedQueryChecks: '재검색 문장 검사',
  grayZoneJudgments: '회색 구간 판정',
  searchResults: '검색 결과',
  generationInputs: '답변 생성 시작',
  guardResults: '답변 검사',
  guard: '답변 검사',
  outputSafety: '출력 안전 검사',
  finalTransmission: '최종 전송',
  planAnswer: '요금제 답변',
  comparisonAnswer: '비교 답변',
  faqCandidateAnswer: '후보 FAQ 답변',
}
export const stageName = (stage: string | null) => (stage ? (TIMELINE_NAMES[stage] ?? stage) : '(이름 없음)')

/** 모델 호출 작업 (BE LlmGeneration.TaskType). 모르는 값은 그대로 */
const TASK_NAMES: Record<string, string> = {
  ROUTING: '라우팅',
  CONTEXT_RESOLUTION: '문맥 복원',
  RAG_ANSWER: '답변 생성',
  CLARIFICATION: '되묻기',
  CONDITION_EXTRACT: '조건 추출',
  FOLLOW_UP: '후속 질문',
  SUMMARY: '요약',
  SESSION_TITLE: '대화 제목',
  EVIDENCE_CHECK: '근거 판정',
}

/** 모델 호출이 실패한 상태인지 (SUCCESS·NO_EVIDENCE는 정상 응답) */
export const attemptFailed = (status: string | null | undefined) =>
  status != null && status !== 'SUCCESS' && status !== 'NO_EVIDENCE'
export const taskName = (task: string | null) => (task ? (TASK_NAMES[task] ?? task) : '모델 호출')

const KST_TIME = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})
const KST_DAY = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit' })

/** UTC 시각 → KST "14:05:31" */
export const kstTime = (iso: string | null) => (iso ? KST_TIME.format(new Date(iso)) : '–')
/** UTC 시각 → KST "10. 16." */
export const kstDay = (iso: string | null) => (iso ? KST_DAY.format(new Date(iso)) : '')
/** 오늘(KST)인지 */
export const isTodayKst = (iso: string) => KST_DAY.format(new Date(iso)) === KST_DAY.format(new Date())

/** 소요 시간: 850ms · 2.4초 · 27.7초 · 1분 5초 */
export function formatElapsed(ms: number | null | undefined): string {
  if (ms == null) return '–'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}초`
  const m = Math.floor(ms / 60_000)
  const s = Math.round((ms % 60_000) / 1000)
  return s ? `${m}분 ${s}초` : `${m}분`
}

/** 회원이면 이름(번호), 게스트면 게스트 번호 */
export function whoLabel(row: { userId: number | null; userName: string | null; guestId: string | null }): string {
  if (row.userId != null) return `${row.userName ?? '회원'} #${row.userId}`
  if (row.guestId != null) return `게스트 ${row.guestId.slice(0, 8)}`
  return '알 수 없음'
}
