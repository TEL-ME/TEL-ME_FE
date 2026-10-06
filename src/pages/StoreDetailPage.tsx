import { ChevronLeft, Navigation, Phone } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import type { StoreDetail } from '../api/stores'
import StoreEmpty from '../features/stores/components/StoreEmpty'
import StoreMap from '../features/stores/components/StoreMap'
import { DAYS, dayOfWeekOf, hoursText, telHref } from '../features/stores/format'
import { goBack } from '../features/stores/goBack'
import { useStoreDetail } from '../features/stores/queries'
import { showToast } from '../stores/toastStore'

/** 카카오맵 길찾기 (앱이 있으면 앱으로, 없으면 웹으로 열린다) */
const routeUrl = (s: StoreDetail) => `https://map.kakao.com/link/to/${encodeURIComponent(s.name)},${s.latitude},${s.longitude}`

function Frame({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  return (
    <main className="flex min-h-0 flex-1 flex-col bg-bg">
      <header className="flex shrink-0 items-center gap-1 pl-2 pr-4 pt-2">
        <button type="button" aria-label="뒤로" onClick={onBack} className="flex h-11 w-11 items-center justify-center text-ink">
          <ChevronLeft size={22} strokeWidth={2} aria-hidden />
        </button>
        <h1 className="text-[17px] font-extrabold">매장 정보</h1>
      </header>
      {children}
    </main>
  )
}

/** 매장 상세. 없는 매장·폐점 매장(404)은 안내 화면으로 보여 준다 */
export default function StoreDetailPage() {
  const navigate = useNavigate()
  const { storeId: raw } = useParams()
  const storeId = raw && /^\d+$/.test(raw) && Number(raw) > 0 ? Number(raw) : null
  const detail = useStoreDetail(storeId)
  const back = () => goBack(navigate, '/stores')
  // 지도가 핀을 다시 그리지 않게 같은 배열을 넘긴다
  const mapStores = useMemo(() => (detail.data ? [detail.data] : []), [detail.data])

  const gone = storeId == null || (detail.error instanceof ApiError && (detail.error.status === 404 || detail.error.status === 400))
  if (gone) {
    return (
      <Frame onBack={back}>
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <StoreEmpty
            size="lg"
            title="없는 매장이에요"
            actions={
              <button
                type="button"
                onClick={() => navigate('/stores', { replace: true })}
                className="min-h-[52px] w-[260px] max-w-full rounded-2xl bg-brand text-base font-bold text-white"
              >
                다른 매장 찾기
              </button>
            }
          >
            문을 닫았거나 주소가 바뀐 매장이에요.
            <br />
            가까운 다른 매장을 찾아보세요.
          </StoreEmpty>
        </div>
      </Frame>
    )
  }

  if (detail.isPending) {
    return (
      <Frame onBack={back}>
        <div role="status" aria-label="매장 정보를 불러오는 중" className="flex flex-col gap-4 px-4 pt-2">
          <div className="tm-pulse h-[120px] rounded-card bg-surface" />
          <div className="tm-pulse h-8 w-2/3 rounded-xl bg-surface" />
          <div className="tm-pulse h-[300px] rounded-card bg-surface" />
        </div>
      </Frame>
    )
  }

  if (detail.isError) {
    return (
      <Frame onBack={back}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm leading-[22px] text-ink-sub">
            매장 정보를 불러오지 못했어요.
            <br />
            잠시 후 다시 시도해 주세요.
          </p>
          <button
            type="button"
            onClick={() => void detail.refetch()}
            className="h-10 rounded-full bg-surface px-3.5 text-sm font-semibold text-ink"
          >
            다시 시도
          </button>
        </div>
      </Frame>
    )
  }

  const store = detail.data
  const today = dayOfWeekOf(new Date())

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(store.address)
      showToast('주소를 복사했어요')
    } catch {
      showToast('주소를 복사하지 못했어요')
    }
  }

  return (
    <Frame onBack={back}>
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2">
        <div className="relative h-[120px] shrink-0 overflow-hidden rounded-card bg-surface-2">
          <StoreMap
            stores={mapStores}
            selectedId={null}
            me={null}
            fitKey={String(store.storeId)}
            anchor={null}
            bottomInset={0}
            interactive={false}
            label={`${store.name} 위치`}
          />
        </div>

        <div className="flex flex-col gap-1.5 px-1">
          <h2 className="text-2xl font-extrabold leading-8 tracking-[-0.5px]">{store.name}</h2>
          <div className="flex items-center gap-2 text-sm leading-5 text-ink-sub">
            <span className="min-w-0 flex-1">{store.address}</span>
            <button
              type="button"
              onClick={() => void copyAddress()}
              className="shrink-0 rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-ink"
            >
              주소 복사
            </button>
          </div>
          {store.phone && <span className="text-sm text-ink-sub">{store.phone}</span>}
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="px-1 text-[13px] font-bold text-ink-sub">가능 업무</h3>
          {store.services.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {store.services.map((sv) => (
                <li key={sv.code} className="rounded-full bg-brand-soft px-3 py-1.5 text-[13px] font-bold text-brand-strong">
                  {sv.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-1 text-sm text-ink-sub">정보 없음</p>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="px-1 text-[13px] font-bold text-ink-sub">영업시간</h3>
          <ul className="rounded-card bg-surface px-4 py-1">
            {DAYS.map((d, i) => {
              const hours = store.hours.find((h) => h.dayOfWeek === d.key)
              const isToday = d.key === today
              const text = hoursText(hours)
              return (
                <li
                  key={d.key}
                  className={`flex min-h-[42px] items-center gap-2 text-[15px] ${i > 0 ? 'border-t border-surface-2' : ''} ${
                    isToday ? 'font-bold' : 'font-medium'
                  }`}
                >
                  <span className="w-7">{d.label}</span>
                  {isToday && (
                    <span className="rounded-full bg-brand-soft px-[7px] py-px text-[11px] font-bold text-brand-strong">오늘</span>
                  )}
                  <span className={`flex-1 text-right ${text === '휴무' || text === '정보 없음' ? 'text-ink-muted' : ''}`}>{text}</span>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <div className="flex shrink-0 gap-2 bg-bg px-4 py-2.5">
        {store.phone && (
          <a
            href={telHref(store.phone)}
            className="flex min-h-[52px] flex-1 items-center justify-center gap-1.5 rounded-2xl bg-surface text-base font-bold text-ink no-underline"
          >
            <Phone size={18} strokeWidth={1.8} aria-hidden />
            전화하기
          </a>
        )}
        <a
          href={routeUrl(store)}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-[52px] flex-1 items-center justify-center gap-1.5 rounded-2xl bg-brand text-base font-bold text-white no-underline"
        >
          <Navigation size={18} strokeWidth={1.8} aria-hidden />
          길찾기
        </a>
      </div>
    </Frame>
  )
}
