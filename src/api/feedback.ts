import { api } from './client'
import type { FeedbackResponse, FeedbackSaveRequest } from './types'

const path = (messageId: number) => `/api/v1/chat/messages/${messageId}/feedback`

export const feedbackApi = {
  get: (messageId: number) => api<FeedbackResponse | null>(path(messageId)),
  save: (messageId: number, body: FeedbackSaveRequest) =>
    api<FeedbackResponse>(path(messageId), { method: 'PUT', body }),
  remove: (messageId: number) => api<null>(path(messageId), { method: 'DELETE' }),
}
