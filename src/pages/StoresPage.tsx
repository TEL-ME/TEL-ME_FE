import { ChevronRight, LocateFixed, RotateCw, Search } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import LocationDialog from '../features/stores/components/LocationDialog'
import StoreEmpty from '../features/stores/components/StoreEmpty'
import StoreMap from '../features/stores/components/StoreMap'
import { formatDistance, type LatLng } from '../features/stores/format'
import { hasKakaoKey } from '../features/stores/kakao/loadKakao'
import { useServiceTypes, useStoreList } from '../features/stores/queries'
import {
  clearServices,
  searchNearMe,
  selectStore,
  setOrigin,
  setSheetFull,
  toggleService,
  useStoreSearch,
  type SearchOrigin,
} from '../features/stores/storeSearchStore'
import { showToast } from '../stores/toastStore'

/** 목록 시트가 차지하는 높이 (화면 높이에 대한 비율) */
const SHEET_PEEK = 0.46
const SHEET_FULL = 0.8
/** 위쪽 검색창이 지도를 가리는 높이 */
const TOP_INSET = 66
const DRAG_THRESHOLD = 24

const floating = 'bg-surface shadow-[0_8px_24px_rgba(80,50,65,0.07)]'
const pill = 'h-10 rounded-full bg-surface px-3.5 text-sm font-semibold text-ink'

function titleOf(origin: SearchOrigin): string {
  if (origin.kind === 'near') return '가까운 매장'
  if (origin.kind === 'region') return `${origin.label} 매장`
  return origin.label ? `${origin.label} 주변 매장` : '이 지역 매장'
}

function emptyCopy(origin: SearchOrigin, filtered: boolean): { title: string; text: string } {
  if (origin.kind === 'near') {
    return {
      title: '주변에 매장이 없어요',
      text: filtered ? '고른 업무를 모두 하는 매장이 10km 안에 없어요.' : '10km 안에 매장이 없어요. 지역으로 찾아보세요.',
    }
  }
  if (origin.kind === 'area') {
    return {
      title: '이 근처에 매장이 없어요',
      text: filtered ? '고른 업무를 모두 하는 매장이 이 근처에 없어요.' : '지도를 옮기거나 지역으로 찾아보세요.',
    }
  }
  return {
    title: '조건에 맞는 매장이 없어요',
    text: filtered ? '고른 업무를 모두 하는 매장이 없어요.' : '이 지역에는 아직 매장이 없어요.',
  }
}

/** 매장 (지도 + 목록 한 화면). 목록은 아래 시트에 있고, 손잡이를 올리면 넓어진다 */
export default function StoresPage() {
  const navigate = useNavigate()
  const { origin, services, me, selectedId, sheetFull } = useStoreSearch()
  const serviceTypes = useServiceTypes()
  const list = useStoreList(origin, services, me)

  // 시트가 가리는 높이를 지도에 알려 주려고 화면 높이를 잰다
  const mainRef = useRef<HTMLElement>(null)
  const [height, setHeight] = useState(0)
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setHeight(el.clientHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const bottomInset = Math.round(height * (sheetFull ? SHEET_FULL : SHEET_PEEK))

  /** 사용자가 지도를 옮긴 곳. 있으면 "이 지역에서 다시 검색"을 보여 준다 */
  const [moved, setMoved] = useState<{ center: LatLng; radiusMeters: number } | null>(null)
  /** 지도를 옮겨 다시 검색한 결과는 지금 보는 곳을 그대로 둔다 */
  const [keepViewKey, setKeepViewKey] = useState<string | null>(null)
  const [askLocation, setAskLocation] = useState(false)
  const [locating, setLocating] = useState(false)
  const closeAsk = useCallback(() => setAskLocation(false), [])

  const searchKey = JSON.stringify([origin, services])
  const settled = !list.isPending && !list.isFetching
  // 지역 검색은 "더 보기"로 매장이 늘면 그만큼 다시 맞춘다
  const fitKey =
    settled && searchKey !== keepViewKey ? `${searchKey}|${origin.kind === 'region' ? list.items.length : ''}` : null

  const listRef = useRef<HTMLDivElement>(null)
  // 새로 찾으면 목록을 맨 위부터 보여 준다
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 })
  }, [searchKey])
  // 지도에서 누른 매장의 카드를 목록 맨 위로 올린다 (scrollIntoView는 화면 전체를 밀 수 있어 직접 계산한다)
  useEffect(() => {
    const box = listRef.current
    const card = selectedId == null ? null : document.getElementById(`store-card-${selectedId}`)
    if (!box || !card) return
    const offset = card.getBoundingClientRect().top - box.getBoundingClientRect().top
    box.scrollTo({ top: box.scrollTop + offset - 2, behavior: 'smooth' })
  }, [selectedId])

  const openRegion = () => navigate('/stores/region')

  const searchHere = () => {
    if (!moved) return
    const next: SearchOrigin = { kind: 'area', center: moved.center, radiusMeters: moved.radiusMeters }
    setKeepViewKey(JSON.stringify([next, services]))
    setMoved(null)
    setOrigin(next)
  }

  const locate = () => {
    setAskLocation(false)
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        setMoved(null)
        searchNearMe({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      (err) => {
        setLocating(false)
        showToast(
          err.code === err.PERMISSION_DENIED
            ? '위치 권한이 꺼져 있어요. 지역으로 찾아보세요'
            : '현재 위치를 찾지 못했어요. 잠시 후 다시 시도해 주세요',
        )
      },
      { timeout: 10_000, maximumAge: 60_000 },
    )
  }

  /** 현재 위치 버튼. 이미 허용했으면 바로 찾고, 아니면 먼저 묻는다 */
  const onLocate = async () => {
    if (!('geolocation' in navigator)) {
      showToast('이 브라우저에서는 현재 위치를 쓸 수 없어요')
      return
    }
    if (me) return locate()
    let granted = false
    try {
      granted = (await navigator.permissions?.query({ name: 'geolocation' }))?.state === 'granted'
    } catch {
      // 권한 상태를 알려 주지 않는 브라우저는 물어본다
    }
    if (granted) locate()
    else setAskLocation(true)
  }

  // 손잡이: 누르면 접었다 펴고, 위아래로 끌어도 된다
  const dragStart = useRef<number | null>(null)
  const dragged = useRef(false)
  const onHandleDown = (e: PointerEvent<HTMLButtonElement>) => {
    dragStart.current = e.clientY
    dragged.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onHandleUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (dragStart.current == null) return
    const dy = e.clientY - dragStart.current
    dragStart.current = null
    if (Math.abs(dy) < DRAG_THRESHOLD) return
    dragged.current = true
    setSheetFull(dy < 0)
  }
  const onHandleClick = () => {
    if (dragged.current) {
      dragged.current = false
      return
    }
    setSheetFull(!sheetFull)
  }

  const isDefault = origin.kind === 'region' && origin.auto
  const searchLabel = isDefault
    ? hasKakaoKey
      ? '지역, 역 이름으로 찾기'
      : '지역으로 찾기'
    : origin.kind === 'near'
      ? '내 주변'
      : (origin.label ?? '지도에서 고른 위치')

  const count = list.isPending
    ? ''
    : origin.kind === 'region'
      ? list.total != null
        ? `${list.total}곳`
        : `${list.items.length}곳${list.hasMore ? ' 이상' : ''}`
      : `가까운 순 ${list.items.length}곳`
  const empty = emptyCopy(origin, services.length > 0)
  const hasDistance = list.items.some((s) => s.distanceMeters != null)

  return (
    <main ref={mainRef} className="relative min-h-0 flex-1 overflow-hidden">
      <StoreMap
        stores={list.items}
        selectedId={selectedId}
        me={me}
        fitKey={fitKey}
        anchor={origin.kind === 'region' ? null : origin.center}
        bottomInset={bottomInset}
        topInset={TOP_INSET}
        label="매장 지도"
        onSelect={selectStore}
        onMoved={(center, radiusMeters) => setMoved({ center, radiusMeters })}
      />

      <div className="absolute inset-x-4 top-3 z-10 flex items-center gap-2">
        <h1
          aria-label="TEL-ME 매장"
          className={`whitespace-nowrap rounded-2xl px-3 py-2 font-logo text-[22px] font-black leading-[26px] tracking-[-0.6px] ${floating}`}
        >
          tel<span className="text-brand-text">me</span>
        </h1>
        <button
          type="button"
          onClick={openRegion}
          className={`flex h-[42px] min-w-0 flex-1 items-center gap-2 rounded-full px-3.5 text-left text-sm font-semibold ${floating} ${
            isDefault ? 'text-ink-muted' : 'text-ink'
          }`}
        >
          <Search size={18} strokeWidth={2} aria-hidden className="shrink-0 text-ink-sub" />
          <span className="min-w-0 flex-1 truncate">{searchLabel}</span>
        </button>
      </div>

      {moved && (
        <button
          type="button"
          onClick={searchHere}
          className="absolute left-1/2 top-[66px] z-10 flex h-10 -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-inverse px-4 text-sm font-bold text-inverse-ink shadow-[0_8px_24px_rgba(60,40,50,0.2)]"
        >
          <RotateCw size={16} strokeWidth={2.2} aria-hidden />
          이 지역에서 다시 검색
        </button>
      )}

      {!sheetFull && (
        <button
          type="button"
          aria-label="현재 위치로 찾기"
          onClick={() => void onLocate()}
          disabled={locating}
          className={`absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full shadow-[0_8px_24px_rgba(80,50,65,0.1)] ${
            origin.kind === 'near' ? 'bg-brand text-white' : 'bg-surface text-ink'
          } ${locating ? 'tm-pulse' : ''}`}
          style={{ bottom: bottomInset + 12 }}
        >
          <LocateFixed size={20} strokeWidth={1.8} aria-hidden />
        </button>
      )}

      <section
        aria-label="매장 목록"
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[28px] bg-bg shadow-[0_-6px_24px_rgba(80,40,60,0.08)] transition-[height] duration-300"
        style={{ height: `${(sheetFull ? SHEET_FULL : SHEET_PEEK) * 100}%` }}
      >
        <button
          type="button"
          aria-label={sheetFull ? '목록 접기' : '목록 펼치기'}
          aria-expanded={sheetFull}
          onPointerDown={onHandleDown}
          onPointerUp={onHandleUp}
          onPointerCancel={() => (dragStart.current = null)}
          onClick={onHandleClick}
          className="flex shrink-0 touch-none justify-center pb-1 pt-2.5"
        >
          <span className="h-[5px] w-11 rounded-full bg-line" />
        </button>
        <div className="flex shrink-0 items-baseline gap-2 px-5 pb-2.5 pt-1">
          <h2 className="min-w-0 flex-1 truncate text-[19px] font-extrabold tracking-[-0.3px]">{titleOf(origin)}</h2>
          <span className="shrink-0 text-xs font-semibold text-ink-muted">{count}</span>
        </div>

        {serviceTypes.data && serviceTypes.data.length > 0 && (
          <>
            <div role="group" aria-label="업무 선택" className="no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto px-5 pb-1.5">
              {serviceTypes.data.map((t) => {
                const on = services.includes(t.code)
                return (
                  <button
                    key={t.code}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleService(t.code)}
                    className={`min-h-9 shrink-0 whitespace-nowrap rounded-full border-[1.5px] px-3.5 py-1.5 text-sm ${
                      on ? 'border-brand bg-brand-soft font-bold text-brand-strong' : 'border-surface bg-surface font-medium text-ink'
                    }`}
                  >
                    {t.name}
                  </button>
                )
              })}
            </div>
            <p className="shrink-0 px-5 pb-2 text-xs leading-4 text-ink-muted">
              {services.length > 1 ? '고른 업무가 모두 가능한 매장만 보여요' : '업무를 여러 개 고를 수 있어요'}
            </p>
          </>
        )}

        <div ref={listRef} className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4 pt-0.5">
          {list.isPending ? (
            <div role="status" aria-label="매장을 불러오는 중" className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="tm-pulse h-[74px] shrink-0 rounded-card bg-surface" />
              ))}
            </div>
          ) : list.isError ? (
            <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
              <p className="text-sm leading-[22px] text-ink-sub">
                매장을 불러오지 못했어요.
                <br />
                잠시 후 다시 시도해 주세요.
              </p>
              <button type="button" onClick={list.refetch} className={pill}>
                다시 시도
              </button>
            </div>
          ) : list.items.length === 0 ? (
            <StoreEmpty
              title={empty.title}
              actions={
                <>
                  {services.length > 0 && (
                    <button type="button" onClick={clearServices} className={pill}>
                      업무 선택 해제
                    </button>
                  )}
                  <button type="button" onClick={openRegion} className={pill}>
                    지역으로 찾기
                  </button>
                </>
              }
            >
              {empty.text}
            </StoreEmpty>
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {list.items.map((s) => (
                  <li key={s.storeId}>
                    <button
                      id={`store-card-${s.storeId}`}
                      type="button"
                      onClick={() => navigate(`/stores/${s.storeId}`)}
                      className={`flex w-full items-center gap-2.5 rounded-card border-[1.5px] bg-surface py-3.5 pl-4 pr-3 text-left text-ink ${
                        selectedId === s.storeId ? 'border-brand' : 'border-surface'
                      }`}
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex items-baseline gap-2">
                          <span className="min-w-0 flex-1 text-base font-bold leading-[22px]">{s.name}</span>
                          {s.distanceMeters != null && (
                            <span className="shrink-0 text-sm font-bold text-brand-text">{formatDistance(s.distanceMeters)}</span>
                          )}
                        </span>
                        <span className="text-[13px] leading-[18px] text-ink-sub">{s.address}</span>
                      </span>
                      <ChevronRight size={18} strokeWidth={2} aria-hidden className="shrink-0 text-ink-muted" />
                    </button>
                  </li>
                ))}
              </ul>
              {list.hasMore && (
                <button
                  type="button"
                  onClick={list.fetchMore}
                  disabled={list.isFetchingMore}
                  className="min-h-12 shrink-0 rounded-2xl bg-surface text-[15px] font-bold text-ink disabled:opacity-60"
                >
                  {list.isFetchingMore ? '불러오는 중…' : '더 보기'}
                </button>
              )}
              {hasDistance && (
                <p className="mt-0.5 text-center text-xs leading-[18px] text-ink-muted">
                  거리는 내 위치에서 잰 직선거리예요. 실제 이동 거리와 달라요.
                </p>
              )}
            </>
          )}
        </div>
      </section>

      <LocationDialog
        open={askLocation}
        onAllow={locate}
        onRegion={() => {
          setAskLocation(false)
          openRegion()
        }}
        onClose={closeAsk}
      />
    </main>
  )
}
