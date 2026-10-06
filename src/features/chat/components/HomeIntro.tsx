import { ChevronRight } from 'lucide-react'
import usimImg from '../../../assets/home/deco-usim.png'
import wifiImg from '../../../assets/home/deco-wifi.png'
import mudoImg from '../../../assets/home/mudo-headset.png'
import FitToHeight from '../../../components/FitToHeight'
import { CHIP_CLASS, HOME_CHIPS } from '../homeChips'

interface HomeIntroProps {
  disabled: boolean
  onAsk: (question: string) => void
}

/**
 * 상담 홈 (회색 시안 "상담 홈")
 * 시안 크기 그대로 그리고, 화면이 낮으면 FitToHeight가 전체를 같은 비율로 줄여 스크롤 없이 한 화면에 넣는다.
 */
export default function HomeIntro({ disabled, onAsk }: HomeIntroProps) {
  return (
    <FitToHeight>
      <div className="px-4 pb-2 pt-5">
        <p className="m-0 text-[13px] text-ink-sub">TEL-ME 통신 상담</p>
        <h2 className="mt-1.5 text-[28px] font-extrabold leading-9 tracking-[-0.6px]">
          어려운 통신 고민,
          <br />
          <span className="text-brand-text">무러바라</span>가 함께해요
        </h2>

        <div aria-hidden className="relative mt-1 h-[210px]">
          <img src={mudoImg} alt="" className="absolute left-1/2 top-[58px] z-[2] w-[220px] -translate-x-1/2" />
          <img src={usimImg} alt="" className="tm-bob absolute left-[18px] top-[26px] w-[88px]" />
          <img
            src={wifiImg}
            alt=""
            className="tm-bob absolute right-[25px] top-[22px] w-[80px]"
            style={{ animationDelay: '-1.7s' }}
          />
        </div>

        <section className="relative z-[1] rounded-3xl bg-surface px-4 pb-2.5 pt-[18px]">
          <h3 className="mb-2 text-center text-[19px] font-extrabold leading-7 tracking-[-0.4px]">무엇이든 물어바라!</h3>
          <ul className="flex flex-col gap-0.5">
            {HOME_CHIPS.map((chip) => (
              <li key={chip.label}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onAsk(chip.label)}
                  className="flex min-h-12 w-full items-center gap-3 px-1 py-1.5 text-left text-ink disabled:opacity-60"
                >
                  <span
                    className={`min-w-16 shrink-0 rounded-lg px-2.5 py-[5px] text-center text-[13px] font-bold leading-[18px] ${CHIP_CLASS[chip.tone]}`}
                  >
                    {chip.tag}
                  </span>
                  <span className="min-w-0 flex-1 text-[15px] font-medium leading-[22px]">{chip.label}</span>
                  <ChevronRight size={18} strokeWidth={2.2} aria-hidden className="shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </FitToHeight>
  )
}
