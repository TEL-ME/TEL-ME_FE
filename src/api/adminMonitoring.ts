import { api } from './client'

/** 관리자 AI 처리 흐름 모니터링 (TELME-169, BE AdminChatMonitoringController). 시각은 모두 UTC ISO-8601 */

export type MonitoringStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'BLOCKED'
export type StageState = 'PASSED' | 'PARTIAL' | 'FAILED' | 'SKIPPED' | 'RUNNING'
export type StageKey = 'inputCheck' | 'routing' | 'search' | 'judgment' | 'generation' | 'outputCheck' | 'result'

export interface StageCell {
  state: StageState
  /** 칸에 함께 보여 줄 짧은 글. 값이 늘어날 수 있어 모르는 값도 그대로 보여 준다 */
  label: string | null
}

export type Stages = Record<StageKey, StageCell>

export interface MonitoringListItem {
  /** 사용자 입력 메시지 (행 키 · 커서) */
  messageId: number
  /** 상세 조회 키. 차단(BLOCKED) 행은 null */
  executionId: number | null
  sessionId: number
  userId: number | null
  userName: string | null
  /** 게스트면 게스트 식별자, 회원이면 null */
  guestId: string | null
  status: MonitoringStatus
  /** 차단 행은 메시지 시각 */
  startedAt: string
  endedAt: string | null
  /** 진행 중이면 지금까지 걸린 시간. 차단 행은 null */
  elapsedMs: number | null
  /** 질문 앞 40자 (넘으면 ...) */
  questionPreview: string | null
  intent: string | null
  answerBasis: 'GROUNDED' | 'NO_EVIDENCE' | 'OUT_OF_SCOPE' | null
  errorCode: string | null
  lastStage: string | null
  stages: Stages | null
}

export interface MonitoringList {
  items: MonitoringListItem[]
  /** 다음(더 오래된) 페이지 커서. null이면 더 없다 */
  nextBeforeId: number | null
}

export interface TimelineEntry {
  stage: string | null
  at: string | null
  /** 실행 시작부터 이 단계 기록까지. 시각을 읽지 못하면 null */
  elapsedMs: number | null
}

export interface RoutingEntry {
  intent: string | null
  refinedQuery: string | null
  confidence: number | null
  method: string | null
}

/** 모델 호출 (llm_generations). status: SUCCESS · NO_EVIDENCE · TIMEOUT · CONNECTION_FAILED · MODEL_ERROR · CANCELLED */
export interface ModelAttempt {
  generationId?: number
  attempt?: number | null
  taskType: string | null
  model: string | null
  promptVersion: string | null
  contextCount: number | null
  status: string | null
  firstTokenMs: number | null
  totalMs: number | null
  /** 호출이 끝난 시각. 막대는 createdAt − totalMs ~ createdAt */
  createdAt: string
  [key: string]: unknown
}

export interface MonitoringDetail {
  executionId: number
  sessionId: number
  inputMessageId: number | null
  outputMessageId: number | null
  userId: number | null
  userName: string | null
  guestId: string | null
  status: MonitoringStatus
  errorCode: string | null
  startedAt: string
  endedAt: string | null
  elapsedMs: number | null
  answerBasis: MonitoringListItem['answerBasis']
  stages: Stages | null
  originalUserMessage: string | null
  /** 진행 중이면 null */
  finalAnswer: string | null
  answerStatus: string | null
  inputCheckActions: string[] | null
  /** 단계 기록 순서. 이번 배포 전에 처리된 실행은 빈 배열 */
  timeline: TimelineEntry[]
  /** 처리 기록(pipeline trace)이 남아 있는지 */
  traceRecorded: boolean
  routing: RoutingEntry[]
  modelAttempts: ModelAttempt[]
  /** 단계별 원본 기록. 파이프라인이 바뀌면 구조가 달라질 수 있어 값이 없으면 숨긴다 */
  steps: Record<string, unknown> | null
}

const BASE = '/api/v1/admin/monitoring/executions'

export const adminMonitoringApi = {
  list: (q: { beforeId?: number; size?: number; status?: MonitoringStatus }, signal?: AbortSignal) =>
    api<MonitoringList>(BASE, { query: q, signal }),
  detail: (executionId: number, signal?: AbortSignal) => api<MonitoringDetail>(`${BASE}/${executionId}`, { signal }),
}
