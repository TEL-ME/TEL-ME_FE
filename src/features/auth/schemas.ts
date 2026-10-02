import { z } from 'zod'

// 백엔드 규칙: 이메일 255자, 비밀번호 8자 이상 · UTF-8 72바이트 이하
const utf8Bytes = (s: string) => new TextEncoder().encode(s).length

const email = z.string().trim().min(1, '이메일을 입력해 주세요').email('이메일 형식을 확인해 주세요').max(255)
const password = z
  .string()
  .min(8, '비밀번호를 8자 이상 입력해 주세요')
  .refine((v) => utf8Bytes(v) <= 72, '비밀번호가 너무 길어요')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, '비밀번호를 입력해 주세요'),
})
export type LoginForm = z.infer<typeof loginSchema>

export const signupSchema = z
  .object({
    // users.name VARCHAR(50)
    name: z.string().trim().min(1, '이름을 입력해 주세요').max(50, '이름은 50자까지 입력할 수 있어요'),
    email,
    password,
    passwordConfirm: z.string(),
    agreeTerms: z.boolean(),
    agreePrivacy: z.boolean(),
  })
  .refine((v) => v.password === v.passwordConfirm, { path: ['passwordConfirm'], message: '비밀번호가 서로 달라요' })
  .refine((v) => v.agreeTerms && v.agreePrivacy, { path: ['agreeTerms'], message: '필수 약관에 동의해 주세요' })
export type SignupForm = z.infer<typeof signupSchema>
