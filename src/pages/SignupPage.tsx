import { zodResolver } from '@hookform/resolvers/zod'
import { Check, CircleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import TextField from '../components/TextField'
import AuthScreen from '../features/auth/AuthScreen'
import { takeLoginReturn } from '../features/auth/loginSheetStore'
import { signupSchema, type SignupForm } from '../features/auth/schemas'
import { afterLogin } from '../features/auth/useAuth'
import { showToast } from '../stores/toastStore'

const DUPLICATE = 'MEMBER409-0'

function CheckRow({
  checked,
  onToggle,
  label,
  strong,
}: {
  checked: boolean
  onToggle: () => void
  label: ReactNode
  strong?: boolean
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={`flex min-h-11 w-full items-center gap-2.5 text-left text-sm leading-5 text-ink ${strong ? 'font-bold' : 'font-medium'}`}
    >
      <span
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border-[1.5px] ${
          checked ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-transparent'
        }`}
      >
        <Check size={14} strokeWidth={2.6} aria-hidden />
      </span>
      <span className="flex-1">{label}</span>
    </button>
  )
}

export default function SignupPage() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', passwordConfirm: '', agreeTerms: false, agreePrivacy: false },
  })
  const [agreeTerms, agreePrivacy] = useWatch({ control, name: ['agreeTerms', 'agreePrivacy'] })
  const all = agreeTerms && agreePrivacy
  const toggle = (k: 'agreeTerms' | 'agreePrivacy', v: boolean) => setValue(k, v, { shouldValidate: !!errors.agreeTerms })

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    try {
      await authApi.signup(name, email, password)
      await afterLogin()
      showToast('가입을 마쳤어요. 게스트로 나눈 상담도 이어져요')
      navigate(takeLoginReturn(), { replace: true })
    } catch (e) {
      if (e instanceof ApiError && e.code === DUPLICATE) setError('email', { type: DUPLICATE, message: e.message })
      else setError('root', { message: e instanceof ApiError ? e.message : '가입하지 못했어요. 잠시 후 다시 시도해 주세요.' })
    }
  })

  return (
    <AuthScreen
      title="이메일로 회원가입"
      subtitle="가입하면 게스트로 나눈 상담이 그대로 이어져요"
      footer={
        <>
          <button
            type="submit"
            form="signup-form"
            disabled={isSubmitting}
            className="min-h-[52px] rounded-2xl bg-inverse text-base font-bold text-inverse-ink disabled:opacity-60"
          >
            {isSubmitting ? '가입 중…' : '가입하기'}
          </button>
          <p className="text-center text-sm leading-5 text-ink-sub">
            이미 계정이 있나요?{' '}
            <button
              type="button"
              onClick={() => navigate('/auth/login', { replace: true })}
              className="px-0.5 py-1 font-bold text-brand-strong underline underline-offset-[3px]"
            >
              로그인
            </button>
          </p>
        </>
      }
    >
      <form id="signup-form" noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <TextField
            label="이름"
            autoComplete="name"
            placeholder="홍길동"
            maxLength={50}
            error={errors.name?.message}
            {...register('name')}
          />
          <TextField
            label="이메일"
            type="email"
            autoComplete="email"
            placeholder="example@email.com"
            error={errors.email?.message}
            errorAction={
              errors.email?.type === DUPLICATE && (
                <button
                  type="button"
                  onClick={() => navigate('/auth/login', { replace: true, state: { email: getValues('email') } })}
                  className="py-0.5 text-[13px] font-bold text-brand-strong underline underline-offset-[3px]"
                >
                  이 이메일로 로그인하기
                </button>
              )
            }
            {...register('email')}
          />
          <TextField
            label="비밀번호"
            type="password"
            autoComplete="new-password"
            placeholder="비밀번호 입력"
            hint="8자 이상 입력해 주세요"
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
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col rounded-[18px] bg-surface px-3.5 py-1">
            <CheckRow
              strong
              checked={all}
              onToggle={() => {
                toggle('agreeTerms', !all)
                toggle('agreePrivacy', !all)
              }}
              label="약관 전체 동의"
            />
            <div className="my-0.5 h-px bg-surface-2" />
            <CheckRow
              checked={agreeTerms}
              onToggle={() => toggle('agreeTerms', !agreeTerms)}
              label={
                <>
                  이용약관 동의 <span className="font-medium text-ink-sub">(필수)</span>
                </>
              }
            />
            <CheckRow
              checked={agreePrivacy}
              onToggle={() => toggle('agreePrivacy', !agreePrivacy)}
              label={
                <>
                  개인정보 수집·이용 동의 <span className="font-medium text-ink-sub">(필수)</span>
                </>
              }
            />
          </div>
          {(errors.agreeTerms?.message || errors.root?.message) && (
            <p role="alert" className="flex gap-1.5 px-1 text-[13px] font-semibold leading-[18px] text-danger">
              <CircleAlert size={16} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
              <span>{errors.agreeTerms?.message ?? errors.root?.message}</span>
            </p>
          )}
        </div>
      </form>
    </AuthScreen>
  )
}
