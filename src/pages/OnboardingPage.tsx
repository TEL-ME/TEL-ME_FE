import { Mail, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setLoginReturn } from '../features/auth/loginSheetStore'
import { SOCIAL_PROVIDERS, startSocialLogin } from '../features/auth/socialProviders'
import { useMe } from '../features/auth/useAuth'
import { markOnboarded } from '../features/onboarding/onboardingFlag'
import { StepEvidence, StepFeatures, StepHello, StepLogin } from '../features/onboarding/OnboardingSteps'

const STEPS = [StepHello, StepFeatures, StepEvidence, StepLogin]
const NEXT_LABEL = ['반가워, 무러바라!', '다음', '다음']

function Terms() {
  return (
    <p className="text-center text-[13px] leading-5 text-ink-muted">
      계속하면 <u>이용약관</u>과 <u>개인정보처리방침</u>에
      <br />
      동의하게 됩니다.
    </p>
  )
}

/** 시작하기 4장 → 상담 홈으로 넘어가는 화면 */
export default function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  // 설정 → 시작하기 다시 보기로 들어온 로그인 사용자는 로그인 상태 그대로 둔다
  const { isUser } = useMe()
  // 끝내기: 다시 안 보이게 표시하고, 상담 홈으로 넘어가는 화면(/intro)을 보여 준다
  const finish = (toast = '') => {
    markOnboarded()
    navigate('/intro', { replace: true, state: { toast } })
  }

  const Step = STEPS[step]
  const last = step === STEPS.length - 1

  const login = (path: string) => {
    markOnboarded()
    setLoginReturn('/intro')
    navigate(path)
  }

  return (
    <main className="no-scrollbar mx-auto flex h-full max-w-[480px] flex-col overflow-y-auto bg-bg px-6 pb-6 pt-4">
      {/* 마지막 페이지 전까지만 보인다. 누르면 마지막 페이지(로그인/시작 선택)로 바로 간다 */}
      <div className="flex min-h-6 justify-end">
        {!last && (
          <button
            type="button"
            onClick={() => setStep(STEPS.length - 1)}
            className="text-sm font-medium leading-5 text-ink-muted underline underline-offset-[3px]"
          >
            건너뛰기
          </button>
        )}
      </div>

      <section aria-label={`시작하기 ${step + 1} / ${STEPS.length}`} className="flex flex-1 shrink-0 flex-col justify-center py-4">
        <Step key={step} />
      </section>

      <div className="flex flex-col gap-4">
        <div aria-hidden className="flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full ${i === step ? 'w-[18px] bg-brand' : 'w-1.5 bg-line'}`} />
          ))}
        </div>

        {last && isUser ? (
          <div className="flex flex-col gap-2">
            <p className="text-center text-sm font-semibold text-success">이미 로그인돼 있어요. 상담 기록이 계정에 저장되고 있어요.</p>
            <button
              type="button"
              onClick={() => finish()}
              className="min-h-[52px] rounded-2xl bg-inverse text-base font-bold text-inverse-ink"
            >
              상담 시작하기
            </button>
          </div>
        ) : last ? (
          <div className="flex flex-col gap-2">
            {SOCIAL_PROVIDERS.filter((p) => p.enabled).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  markOnboarded()
                  setLoginReturn('/intro')
                  startSocialLogin(p)
                }}
                className={`flex min-h-[52px] items-center justify-center gap-2 rounded-2xl text-base font-bold ${p.className}`}
              >
                {p.id === 'kakao' && <MessageCircle size={18} fill="currentColor" strokeWidth={0} aria-hidden />}
                {p.id === 'kakao' ? '카카오로 로그인' : p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => login('/auth/login')}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-surface text-base font-bold text-ink"
            >
              <Mail size={18} strokeWidth={2} aria-hidden />
              이메일로 로그인
            </button>
            <button
              type="button"
              onClick={() => finish('게스트로 시작했어요')}
              className="min-h-10 text-[15px] font-semibold text-ink-muted underline underline-offset-[3px]"
            >
              게스트로 시작하기
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="min-h-[52px] rounded-2xl bg-inverse text-base font-bold text-inverse-ink"
          >
            {NEXT_LABEL[step]}
          </button>
        )}
        {step > 0 && <Terms />}
      </div>
    </main>
  )
}
