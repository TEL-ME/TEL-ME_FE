import { FileText, MapPin, MessageSquareText, Sparkles } from 'lucide-react'
import deco from '../../assets/onboarding/deco-bubble.png'
import arm from '../../assets/onboarding/mudo-arm.png'
import body from '../../assets/onboarding/mudo-body.png'
import excited from '../../assets/onboarding/mudo-excited.png'
import hands from '../../assets/onboarding/mudo-hands.png'
import think from '../../assets/onboarding/mudo-think.png'
import wifi from '../../assets/home/deco-wifi.png'

const glow = 'radial-gradient(closest-side, var(--brand-soft), transparent)'
const card = 'rounded-2xl bg-surface shadow-[0_8px_24px_rgba(80,50,65,0.07)]'

/** 0. 무러바라 소개 */
export function StepHello() {
  return (
    <div className="flex flex-col items-center text-center">
      <div aria-hidden className="relative h-[270px] w-[342px] max-w-full">
        <span
          className="absolute -bottom-1.5 -left-2.5 h-60 w-60 rounded-full"
          style={{ background: 'radial-gradient(closest-side, var(--brand-soft) 0%, var(--brand-soft) 62%, transparent 100%)' }}
        />
        <Sparkles size={18} className="tm-bob absolute left-[150px] top-[18px] text-brand" fill="currentColor" strokeWidth={0} />
        <Sparkles size={12} className="tm-bob absolute left-3.5 top-[60px] text-brand" fill="currentColor" strokeWidth={0} style={{ animationDelay: '-1.2s' }} />
        <div className="tm-boing absolute bottom-0 left-0 aspect-[640/593] w-[196px]">
          <img src={body} alt="" className="absolute inset-0 w-full" />
          <img src={arm} alt="" className="tm-wave absolute inset-0 w-full" />
          <span className="tm-burst absolute left-[136px] top-[-14px] h-[34px] w-[34px]">
            <i className="absolute bottom-0.5 left-1 h-3.5 w-1 -rotate-[30deg] rounded bg-[#f5237a]" />
            <i className="absolute bottom-1.5 left-[15px] h-4 w-1 rotate-[5deg] rounded bg-[#f5237a]" />
            <i className="absolute bottom-0 left-[25px] h-[13px] w-1 rotate-[40deg] rounded bg-[#f5237a]" />
          </span>
        </div>
        <span className={`tm-spring absolute right-0 top-[34px] whitespace-nowrap rounded-2xl rounded-br px-[13px] py-[9px] text-[13px] font-semibold leading-[18px] ${card}`} style={{ animationDelay: '.12s' }}>
          안녕, 반가워요!
        </span>
        <span className={`tm-spring absolute right-0 top-[92px] whitespace-nowrap rounded-2xl rounded-br px-[13px] py-[9px] text-[13px] font-semibold leading-[18px] ${card}`} style={{ animationDelay: '.22s' }}>
          나는 카피바라예요
        </span>
        <span className="tm-spring absolute right-[22px] top-[158px] whitespace-nowrap rounded-2xl rounded-bl bg-brand px-[13px] py-[9px] text-[13px] font-semibold leading-[18px] text-white shadow-[0_8px_24px_rgba(80,50,65,0.07)]" style={{ animationDelay: '.9s' }}>
          뭐든 물어봐라!
        </span>
      </div>
      <span className="mt-[22px] rounded-full bg-brand-soft px-3 py-[5px] text-[13px] font-bold text-brand-strong">
        통신이라면 뭐든 아는 카피바라
      </span>
      <h2 className="mb-2.5 mt-3 text-[26px] font-extrabold leading-[34px] tracking-[-0.6px]">
        안녕하세요,
        <br />
        저는 <span className="text-brand-text">무러바라</span>예요
      </h2>
      <p className="text-base leading-[26px] text-ink-muted">
        느긋하고 다정한 카피바라예요.
        <br />
        급할 것 없이, 쉬운 말로 이야기 나눠요.
      </p>
      <dl className="mt-5 grid w-full grid-cols-3 gap-2">
        {[
          ['이름', '무러바라'],
          ['성격', '느긋·다정'],
          ['말버릇', '"물어봐라!"'],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5 rounded-[14px] bg-surface px-1.5 py-2.5">
            <dt className="text-[11px] text-ink-muted">{k}</dt>
            <dd className="text-sm font-bold">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

const FEATURES = [
  { icon: MessageSquareText, title: '요금제·유심·해외 로밍', desc: '헷갈리는 통신 용어도 쉬운 말로 풀어 드려요' },
  { icon: FileText, title: '번호이동·명의변경', desc: '필요한 서류와 순서를 차근차근 알려드려요' },
  { icon: MapPin, title: '가까운 매장 찾기', desc: '원하는 업무가 되는 매장을 지도로 보여드려요' },
]

/** 1. 이렇게 도와드려요 */
export function StepFeatures() {
  return (
    <div className="flex flex-col items-center text-center">
      <div aria-hidden className="relative flex h-[210px] w-[210px] items-center justify-center rounded-full" style={{ background: glow }}>
        <img src={deco} alt="" className="tm-bob absolute -right-2 top-1 w-[72px]" />
        <img src={wifi} alt="" className="tm-bob absolute bottom-6 -left-1.5 w-[58px]" style={{ animationDelay: '-1.4s' }} />
        <img src={hands} alt="" className="relative w-[148px]" />
      </div>
      <h2 className="my-4 text-2xl font-extrabold leading-8 tracking-[-0.5px]">통신 상담, 이렇게 도와드려요</h2>
      <ul className="flex w-full flex-col gap-2 text-left">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <li key={title} className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2.5">
            <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text">
              <Icon size={20} strokeWidth={1.8} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <b className="text-[15px] font-bold leading-5">{title}</b>
              <span className="text-[13px] leading-[18px] text-ink-sub">{desc}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 2. 근거가 있는 답만 */
export function StepEvidence() {
  return (
    <div className="flex flex-col items-center text-center">
      <div aria-hidden className="relative flex h-[260px] w-[260px] items-center justify-center rounded-full" style={{ background: glow }}>
        <img src={think} alt="" className="relative w-[150px] -translate-x-[46px]" />
        <div className={`absolute -right-1.5 bottom-7 flex w-[170px] flex-col gap-1.5 p-3 text-left text-xs leading-4 ${card}`}>
          <span className="font-bold text-ink-sub">참고한 정보</span>
          <span className="rounded-lg bg-surface-2 px-2 py-1.5"><b className="mr-1.5 text-brand-text">1</b>유심 분실 시 대처 방법</span>
          <span className="rounded-lg bg-surface-2 px-2 py-1.5"><b className="mr-1.5 text-brand-text">2</b>유심 재발급 절차</span>
        </div>
      </div>
      <h2 className="mb-3 mt-6 text-2xl font-extrabold leading-8 tracking-[-0.5px]">근거가 있는 답만 드려요</h2>
      <p className="text-base leading-[26px] text-ink-muted">
        답변마다 참고한 상담 자료를 붙이고,
        <br />
        확인할 수 없는 건 모른다고 말해요.
      </p>
    </div>
  )
}

/** 3. 로그인하면 대화가 이어져요 */
export function StepLogin() {
  return (
    <div className="flex flex-col items-center text-center">
      <div aria-hidden className="relative flex h-[220px] w-[220px] items-center justify-center rounded-full" style={{ background: glow }}>
        {/* 위치는 바깥 div, 또잉~ 은 이미지가 (transform이 겹치지 않게) */}
        <div className="relative w-[148px] translate-x-10 translate-y-[39px]">
          <img src={excited} alt="" className="tm-boing w-full" />
        </div>
        <div className="absolute -left-12 -top-1 z-[1] flex flex-col items-end gap-[13px] leading-normal">
          <span className={`flex w-[216px] items-center gap-2 whitespace-nowrap px-3.5 py-3 text-[13px] font-semibold ${card}`}>
            <span className="h-2.5 w-2.5 rounded-[3px] bg-brand" />
            유심 분실 신고
            <span className="rounded-md bg-surface-2 px-[7px] py-0.5 text-[11px] text-ink-muted">3</span>
          </span>
          <span className={`flex w-[168px] items-center gap-2 whitespace-nowrap px-3.5 py-3 text-[13px] font-semibold ${card}`}>
            <span className="h-2.5 w-2.5 rounded-[3px] bg-notice-text" />
            해외 로밍 문의
            <span className="rounded-md bg-surface-2 px-[7px] py-0.5 text-[11px] text-ink-muted">5</span>
          </span>
        </div>
      </div>
      <h2 className="mb-2 mt-4 text-2xl font-extrabold leading-8 tracking-[-0.5px]">로그인하면 대화가 이어져요</h2>
      <p className="text-base leading-[26px] text-ink-muted">
        게스트로 나눈 대화도 로그인하면
        <br />내 계정으로 그대로 옮겨져요.
      </p>
    </div>
  )
}
