import type { CSSProperties } from 'react'
import icon1 from '../../assets/intro/icon-1.png'
import icon2 from '../../assets/intro/icon-2.png'
import icon3 from '../../assets/intro/icon-3.png'
import icon4 from '../../assets/intro/icon-4.png'
import icon5 from '../../assets/intro/icon-5.png'
import icon6 from '../../assets/intro/icon-6.png'
import mudoPhone from '../../assets/intro/mudo-phone.png'
import FitToHeight from '../../components/FitToHeight'

/** 휴대폰에서 아이콘이 하나씩 튀어나오는 위치 (시안 "시작 → 상담 홈 전환 (휴대폰 무러바라)") */
const ICONS = [
  { src: icon1, left: 28, top: 426, w: 66, dx: 9, dy: -361, r: -14, delay: 0 },
  { src: icon2, left: 26, top: 424, w: 70, dx: 104, dy: -391, r: 6, delay: 0.06 },
  { src: icon3, left: 28, top: 426, w: 66, dx: 201, dy: -355, r: 12, delay: 0.12 },
  { src: icon4, left: 30, top: 428, w: 62, dx: 26, dy: -247, r: -8, delay: 0.18 },
  { src: icon5, left: 30, top: 428, w: 62, dx: 184, dy: -247, r: 14, delay: 0.24 },
  { src: icon6, left: 32, top: 430, w: 58, dx: 104, dy: -269, r: 0, delay: 0.3 },
]

const SPARKLES = [
  { left: 40, top: 170, size: 16, delay: 0 },
  { left: 290, top: 175, size: 12, delay: 0.7 },
  { left: 130, top: 40, size: 10, delay: 1.2 },
  { left: 215, top: 300, size: 14, delay: 0.4 },
  { left: 60, top: 300, size: 9, delay: 1.6 },
]

interface IntroTransitionProps {
  onSkip: () => void
}

/** 시작하기를 마치고 상담 홈으로 넘어가는 2.8초 화면 */
export default function IntroTransition({ onSkip }: IntroTransitionProps) {
  return (
    <main aria-label="상담 홈으로 이동 중" className="relative mx-auto flex h-full max-w-[480px] flex-col overflow-hidden bg-bg">
      <button
        type="button"
        onClick={onSkip}
        className="absolute right-5 top-4 z-10 p-1 text-sm font-medium text-ink-muted underline underline-offset-[3px]"
      >
        건너뛰기
      </button>
      <FitToHeight minScale={0.55}>
        <div className="flex flex-col items-center">
          <div aria-hidden className="relative h-[576px] w-full">
            <div
              className="absolute left-0 top-0 h-[468px] w-full rounded-b-[50%_200px]"
              style={{ background: 'var(--intro-arch)' }}
            />
            <div className="absolute left-1/2 top-14 h-[520px] w-[330px] -translate-x-1/2">
              {SPARKLES.map((s, i) => (
                <svg
                  key={i}
                  className="tm-tw absolute"
                  width={s.size}
                  height={s.size}
                  viewBox="0 0 24 24"
                  style={{ left: s.left, top: s.top, animationDelay: `${s.delay}s` }}
                >
                  <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" fill="#e2578f" />
                </svg>
              ))}
              {ICONS.map((ic, i) => (
                <img
                  key={i}
                  src={ic.src}
                  alt=""
                  className="tm-fly absolute z-[4]"
                  style={
                    {
                      left: ic.left,
                      top: ic.top,
                      width: ic.w,
                      '--dx': `${ic.dx}px`,
                      '--dy': `${ic.dy}px`,
                      '--r': `${ic.r}deg`,
                      animationDelay: `${ic.delay}s`,
                    } as CSSProperties
                  }
                />
              ))}
              <span
                className="tm-glow absolute left-[21px] top-[419px] z-[3] h-20 w-20 rounded-full"
                style={{
                  background:
                    'radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(255,214,231,0.6) 55%, rgba(255,214,231,0) 100%)',
                }}
              />
              <div className="tm-tap absolute bottom-7 left-[15px] z-[2] h-[223px] w-[300px]">
                <img src={mudoPhone} alt="" className="absolute inset-0 w-full" />
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-col items-center gap-2.5 px-6 text-center">
            <h1 role="status" className="text-[22px] font-extrabold leading-[30px] tracking-[-0.5px]">
              무러바라가 상담을 열고 있어요
            </h1>
            <p className="text-[15px] leading-[22px] text-ink-sub">잠시 후 상담 홈으로 이동해요</p>
            <div className="mt-2.5 h-1.5 w-[120px] overflow-hidden rounded-full bg-line">
              <div className="tm-bar h-full w-0 rounded-full bg-brand" />
            </div>
          </div>
        </div>
      </FitToHeight>
    </main>
  )
}
