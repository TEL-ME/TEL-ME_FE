import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import mudoImg from '../assets/home/mudo-headset.png'
import TextField from '../components/TextField'
import { adminAccessKey, checkAdminAccess } from '../features/admin/adminAccess'
import { loginSchema, type LoginForm } from '../features/auth/schemas'
import { afterLogin } from '../features/auth/useAuth'

/**
 * 관리자 전용 로그인 (관리자 시안 "AdminLogin", PC 화면).
 * 왼쪽 소개 패널 + 오른쪽 로그인 폼. 좁은 화면에서는 폼만 보인다.
 */
export default function AdminLoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      await authApi.login(email, password)
      await afterLogin()
      const access = await checkAdminAccess()
      queryClient.setQueryData(adminAccessKey, access)
      if (access === 'admin') navigate('/admin', { replace: true })
      else setError('root', { message: '관리자 권한이 없는 계정이에요.' })
    } catch (e) {
      setError('root', { message: e instanceof ApiError ? e.message : '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.' })
    }
  })

  return (
    <div className="flex h-full bg-surface">
      <aside
        className="hidden w-[56%] max-w-[900px] shrink-0 flex-col border-r border-line p-14 lg:flex"
        style={{ background: 'var(--admin-hero)' }}
      >
        <div className="flex items-center gap-2">
          <span aria-label="TEL-ME" className="font-logo text-[32px] font-black tracking-[-0.8px] text-ink">
            tel<span className="text-brand-text">me</span>
          </span>
          <span className="rounded-full bg-inverse px-2.5 py-[3px] text-xs font-bold text-inverse-ink">관리자</span>
        </div>
        {/* 무러바라와 문구를 핑크 영역 가운데에 */}
        <div className="my-auto flex flex-col items-center gap-3 text-center">
          <img src={mudoImg} alt="헤드셋을 쓴 무러바라" className="w-[300px]" />
          <h1 className="text-[34px] font-extrabold leading-[44px] tracking-[-0.8px]">
            무러바라가 거짓말하지 않게,
            <br />
            <span className="text-brand-text">답변을 돌보는 곳</span>이에요
          </h1>
          <p className="text-base leading-[26px] text-ink-sub">답 못 한 질문과 오류 신고를 보고, FAQ와 매장 정보를 고쳐요.</p>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <form
          noValidate
          onSubmit={(e) => {
            clearErrors('root')
            void onSubmit(e)
          }}
          aria-labelledby="admin-login-title"
          className="flex w-full max-w-[380px] flex-col gap-4"
        >
          {/* 좁은 화면에서는 왼쪽 패널 대신 로고만 */}
          <span aria-hidden className="font-logo text-[28px] font-black tracking-[-0.8px] lg:hidden">
            tel<span className="text-brand-text">me</span>
          </span>
          <h2 id="admin-login-title" className="mb-1 text-2xl font-extrabold tracking-[-0.4px]">
            관리자 로그인
          </h2>
          <div className="flex flex-col gap-4 [&_input]:h-11 [&_input]:rounded-xl [&_input]:border-line [&_input]:text-[15px] [&_input[aria-invalid]]:border-danger [&_input:focus]:border-brand">
            <TextField
              label="이메일"
              type="email"
              autoComplete="username"
              placeholder="admin@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <TextField
              label="비밀번호"
              type="password"
              autoComplete="current-password"
              placeholder="비밀번호"
              error={errors.password?.message}
              {...register('password')}
            />
          </div>
          {errors.root?.message && (
            <p role="alert" className="text-[13px] font-semibold text-danger">
              {errors.root.message}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-[52px] rounded-2xl bg-brand text-base font-bold text-white disabled:opacity-60"
          >
            {isSubmitting ? '확인 중…' : '로그인'}
          </button>
          <p className="text-[13px] leading-5 text-ink-muted">관리자 권한이 있는 계정만 들어올 수 있어요.</p>
          <Link to="/" className="self-start text-[13px] text-ink-muted underline underline-offset-[3px]">
            상담 앱으로 돌아가기
          </Link>
        </form>
      </main>
    </div>
  )
}
