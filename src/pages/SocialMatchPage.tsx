import { Link2, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import ConfirmDialog from '../components/ConfirmDialog'
import TextField from '../components/TextField'
import AuthScreen from '../features/auth/AuthScreen'
import { openLoginSheet, takeLoginReturn } from '../features/auth/loginSheetStore'
import { SocialIcon } from '../features/auth/SocialIcon'
import { asProvider, PROVIDER_NAME } from '../features/auth/socialProviders'
import { afterLogin } from '../features/auth/useAuth'
import { showToast } from '../stores/toastStore'

const EXPIRED = 'MEMBER400-0'
const EXPIRED_MESSAGE = '시간이 지나 연결 요청이 만료됐어요. 다시 로그인해 주세요.'

/**
 * 소셜 로그인 중 같은 이메일로 가입한 계정이 있을 때 (MEMBER409-1, ⑫).
 * 비밀번호를 확인해 그 계정에 연결하거나, 연결하지 않고 새 계정으로 시작한다. 서버가 10분간만 기억한다.
 */
export default function SocialMatchPage() {
  const navigate = useNavigate()
  const { state } = useLocation() as { state: { provider?: string } | null }
  const provider = asProvider(state?.provider)
  const name = provider ? PROVIDER_NAME[provider] : '소셜'
  // 받침에 따라 와/과
  const nameAnd = provider === 'KAKAO' ? '카카오와' : provider === 'GOOGLE' ? 'Google과' : '소셜 로그인과'

  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmNew, setConfirmNew] = useState(false)

  const finish = async (message: string) => {
    await afterLogin()
    showToast(message)
    navigate(takeLoginReturn(), { replace: true })
  }

  /** 만료되면 처음부터 다시 로그인하게 한다 */
  const expire = () => {
    const to = takeLoginReturn()
    navigate(to === '/intro' ? '/' : to, { replace: true })
    openLoginSheet({ error: EXPIRED_MESSAGE })
  }

  const link = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!password) {
      setError('비밀번호를 입력해 주세요')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await authApi.socialLink(password)
      await finish(`${name} 로그인을 연결했어요`)
    } catch (err) {
      if (err instanceof ApiError && err.code === EXPIRED) expire()
      else if (err instanceof ApiError && err.code === 'MEMBER401-0') setError('비밀번호가 올바르지 않아요')
      else setError(err instanceof ApiError ? err.message : '연결하지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  const startNew = async () => {
    setConfirmNew(false)
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await authApi.socialStartNew()
      await finish(`${name} 계정으로 새로 시작했어요`)
    } catch (err) {
      if (err instanceof ApiError && err.code === EXPIRED) expire()
      else setError(err instanceof ApiError ? err.message : '계정을 만들지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  const back = () => {
    const to = takeLoginReturn()
    navigate(to === '/intro' ? '/' : to, { replace: true })
  }

  return (
    <AuthScreen
      onBack={back}
      hero={
        <div aria-hidden className="flex items-center gap-2">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              provider === 'KAKAO' ? 'bg-[#fee500] text-[#191600]' : 'border-[1.5px] border-line bg-white text-ink'
            }`}
          >
            {provider ? <SocialIcon code={provider} size={22} /> : <Link2 size={20} strokeWidth={2} />}
          </span>
          <Link2 size={20} strokeWidth={2} className="text-brand-strong" />
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
            <Mail size={20} strokeWidth={1.8} />
          </span>
        </div>
      }
      title="이미 가입한 계정이 있어요"
      subtitle={`${name} 계정과 같은 이메일로 가입한 TEL-ME 계정이 있어요. 비밀번호를 확인하면 그 계정에 ${name} 로그인을 연결해요.`}
      footer={
        <>
          <button
            type="submit"
            form="social-match-form"
            disabled={busy}
            className="min-h-[52px] rounded-2xl bg-inverse text-base font-bold text-inverse-ink disabled:opacity-60"
          >
            {busy ? '확인하는 중…' : '확인하고 연결하기'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmNew(true)}
            className="min-h-[52px] rounded-2xl border-[1.5px] border-line bg-surface text-base font-bold text-ink disabled:opacity-60"
          >
            새 계정으로 시작하기
          </button>
        </>
      }
    >
      <form id="social-match-form" noValidate onSubmit={(e) => void link(e)} className="flex flex-col gap-4">
        <TextField
          label="기존 계정 비밀번호"
          type="password"
          autoComplete="current-password"
          placeholder="비밀번호 입력"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error ?? undefined}
        />
        <p className="text-[13px] leading-[19px] text-ink-sub">
          연결하면 {nameAnd} 이메일 중 어느 쪽으로 로그인해도 같은 계정이에요. 10분 안에 진행해 주세요.
        </p>
      </form>

      <ConfirmDialog
        open={confirmNew}
        title="새 계정으로 시작할까요?"
        confirmLabel="새 계정으로 시작"
        onConfirm={() => void startNew()}
        onCancel={() => setConfirmNew(false)}
      >
        {name} 계정으로 새 TEL-ME 계정을 만들어요. 기존 계정의 채팅과 회원 정보는 합쳐지지 않고, 나중에 두 계정을 연결할 수도 없어요.
      </ConfirmDialog>
    </AuthScreen>
  )
}
