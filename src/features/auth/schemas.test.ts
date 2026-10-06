import { describe, expect, it } from 'vitest'
import { signupSchema } from './schemas'

const base = { name: '홍길동', email: 'a@b.co', password: 'password1', passwordConfirm: 'password1', agreeTerms: true, agreePrivacy: true }

describe('signupSchema', () => {
  it('올바른 입력은 통과', () => {
    expect(signupSchema.safeParse(base).success).toBe(true)
  })
  it('비밀번호 8자 미만', () => {
    expect(signupSchema.safeParse({ ...base, password: 'short', passwordConfirm: 'short' }).success).toBe(false)
  })
  it('비밀번호 확인 불일치', () => {
    expect(signupSchema.safeParse({ ...base, passwordConfirm: 'different1' }).success).toBe(false)
  })
  it('이름 빈칸', () => {
    expect(signupSchema.safeParse({ ...base, name: '  ' }).success).toBe(false)
  })
  it('필수 약관 미동의', () => {
    expect(signupSchema.safeParse({ ...base, agreePrivacy: false }).success).toBe(false)
  })
})
