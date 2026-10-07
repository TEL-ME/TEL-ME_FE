import type { ReactNode } from 'react'
import searchImg from '../../../assets/stores/mudo-search.png'

interface StoreEmptyProps {
  title: string
  children: ReactNode
  /** 아래에 두는 버튼들 */
  actions?: ReactNode
  /** 화면 전체를 쓰는 안내(없는 매장)는 크게 */
  size?: 'sm' | 'lg'
}

/** 매장이 없을 때의 안내. 지도를 살펴보는 무러바라와 함께 보여 준다 */
export default function StoreEmpty({ title, children, actions, size = 'sm' }: StoreEmptyProps) {
  const lg = size === 'lg'
  return (
    <div className={`flex flex-col items-center text-center ${lg ? 'gap-2' : 'gap-1.5 px-2 pb-2 pt-1'}`}>
      <img src={searchImg} alt="" className={lg ? 'w-[150px]' : 'w-[104px]'} />
      <h3 className={lg ? 'mt-2 text-xl font-extrabold' : 'mt-0.5 text-[17px] font-extrabold'}>{title}</h3>
      <p className={`text-ink-sub ${lg ? 'mb-3 text-sm leading-[22px]' : 'mb-2 text-[13px] leading-5'}`}>{children}</p>
      {actions && <div className="flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  )
}
