import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = { save: vi.fn(), readSession: vi.fn() }
vi.mock('../../api/notifications', () => ({ notificationsApi: api }))

const { readNotificationsOf, saveNotification } = await import('./queries')

describe('알림 저장·읽음', () => {
  beforeEach(() => {
    api.save.mockReset()
    api.readSession.mockReset()
  })

  it('저장은 종류·대화·메시지를 그대로 보낸다', async () => {
    api.save.mockResolvedValue({})
    await saveNotification('ANSWER_ARRIVED', 3, 45)
    expect(api.save).toHaveBeenCalledWith('ANSWER_ARRIVED', 3, 45)
  })

  it('저장·읽음이 실패해도 예외를 밖으로 내보내지 않는다', async () => {
    api.save.mockRejectedValue(new Error('404'))
    api.readSession.mockRejectedValue(new Error('404'))
    await expect(saveNotification('ANSWER_FAILED', 3, 45)).resolves.toBeUndefined()
    await expect(readNotificationsOf(3)).resolves.toBeUndefined()
  })
})
