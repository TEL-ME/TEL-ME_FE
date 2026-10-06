import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import TextField from '../components/TextField'
import AuthScreen from '../features/auth/AuthScreen'
import { addEmailLoginSchema, type AddEmailLoginForm } from '../features/auth/schemas'
import { afterLogin, useMe } from '../features/auth/useAuth'
import { showToast } from '../stores/toastStore'

/** 설정 › 이메일 로그인 추가 (카카오로만 가입한 회원) */
export default function AddEmailLoginPage() {
  const navigate = useNavigate()
  const { me, isUser, isLoading } = useMe()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AddEmailLoginForm>({
    resolver: zodResolver(addEmailLoginSchema),
    defaultValues: { email: '', password: '', passwordConfirm: '' },
  })

  // 로그인하지 않았거나 이미 이메일 로그인이 있으면 설정으로 돌려보낸다
  const notNeeded = !isLoading && (!isUser || me.loginMethods.includes('EMAIL'))
  useEffect(() => {
    if (notNeeded) navigate('/settings', { replace: true })
  }, [notNeeded, navigate])

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      await authApi.addEmailLogin(email, password)
      await afterLogin()
      showToast('이메일 로그인을 추가했어요. 이제 이메일로도 로그인할 수 있어요')
      navigate('/settings', { replace: true })
    } catch (e) {
      if (e instanceof ApiError && e.code === 'MEMBER409-0') setError('email', { message: '이미 다른 계정에서 쓰고 있는 이메일이에요' })
      else if (e instanceof ApiError && e.code === 'MEMBER409-3') {
        await afterLogin()
        showToast('이미 이메일 로그인이 등록되어 있어요')
        navigate('/settings', { replace: true })
      } else setError('root', { message: e instanceof ApiError ? e.message : '추가하지 못했어요. 잠시 후 다시 시도해 주세요.' })
    }
  })

  return (
    <AuthScreen
      title="이메일 로그인 추가"
      subtitle="카카오 말고 이메일과 비밀번호로도 로그인할 수 있게 해요"
      footer={
        <>
          {errors.root && (
            <p role="alert" className="text-center text-[13px] font-semibold text-danger">
              {errors.root.message}
            </p>
          )}
          <button
            type="submit"
            form="add-email-form"
            disabled={isSubmitting}
            className="min-h-[52px] rounded-2xl bg-inverse text-base font-bold text-inverse-ink disabled:opacity-60"
          >
            {isSubmitting ? '추가하는 중…' : '추가하기'}
          </button>
        </>
      }
    >
      <form id="add-email-form" noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
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
          autoComplete="new-password"
          placeholder="8자 이상"
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="비밀번호 확인"
          type="password"
          autoComplete="new-password"
          placeholder="한 번 더 입력"
          error={errors.passwordConfirm?.message}
          {...register('passwordConfirm')}
        />
      </form>
    </AuthScreen>
  )
}
