import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import TextField from '../components/TextField'
import AuthScreen from '../features/auth/AuthScreen'
import { takeLoginReturn } from '../features/auth/loginSheetStore'
import { loginSchema, type LoginForm } from '../features/auth/schemas'
import { afterLogin } from '../features/auth/useAuth'
import { showToast } from '../stores/toastStore'

export default function EmailLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefillEmail = (location.state as { email?: string } | null)?.email ?? ''
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: prefillEmail, password: '' } })

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      await authApi.login(email, password)
      await afterLogin()
      showToast('로그인했어요. 게스트로 나눈 상담도 이어져요')
      navigate(takeLoginReturn(), { replace: true })
    } catch (e) {
      setError('password', {
        message: e instanceof ApiError ? e.message : '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.',
      })
    }
  })

  return (
    <AuthScreen
      title="이메일로 로그인"
      subtitle="가입할 때 쓴 이메일과 비밀번호를 입력해 주세요"
      footer={
        <>
          <button
            type="submit"
            form="login-form"
            disabled={isSubmitting}
            className="min-h-[52px] rounded-2xl bg-inverse text-base font-bold text-inverse-ink disabled:opacity-60"
          >
            {isSubmitting ? '로그인 중…' : '로그인'}
          </button>
          <p className="text-center text-sm leading-5 text-ink-sub">
            아직 계정이 없나요?{' '}
            <button
              type="button"
              onClick={() => navigate('/auth/signup', { replace: true })}
              className="px-0.5 py-1 font-bold text-brand-strong underline underline-offset-[3px]"
            >
              회원가입
            </button>
          </p>
        </>
      }
    >
      <form id="login-form" noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField
          label="이메일"
          type="email"
          autoComplete="email"
          placeholder="example@email.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="비밀번호"
          type="password"
          autoComplete="current-password"
          placeholder="비밀번호 입력"
          error={errors.password?.message}
          {...register('password')}
        />
      </form>
    </AuthScreen>
  )
}
