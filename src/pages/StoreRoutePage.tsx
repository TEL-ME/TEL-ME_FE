import { Bike, Bus, Car, ChevronLeft, ExternalLink, Footprints, LocateFixed, TrainFront } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import type { RouteMode, RouteStep, RouteStepType } from '../api/stores'
import { formatDistance, kakaoRouteUrl, type LatLng } from '../features/stores/format'
import { goBack } from '../features/stores/goBack'
import { hasKakaoKey } from '../features/stores/kakao/loadKakao'
import { searchPoint } from '../features/stores/kakao/searchPlace'
import { canLocate, locateErrorMessage, locateMe } from '../features/stores/locate'
import { useStoreDetail } from '../features/stores/queries'
import RouteMap from '../features/stores/route/RouteMap'
import RouteAlternatives from '../features/stores/route/RouteAlternatives'
import TransitSteps from '../features/stores/route/TransitSteps'
import { routeErrorView } from '../features/stores/route/routeError'
import {
  durationText,
  fareText,
  isArrived,
  isFocusable,
  needsOriginWalkCheck,
  ROUTE_MODES,
  STEP_LABEL,
  transfersText,
} from '../features/stores/route/routeText'
import { useStoreRoute } from '../features/stores/route/useStoreRoute'
import { useOriginWalk } from '../features/stores/route/useOriginWalk'

interface Origin {
  center: LatLng
  label: string
}

/** 백엔드가 받는 출발지 범위 (대한민국) */
const inKorea = (p: LatLng) => p.lat >= 33 && p.lat <= 39 && p.lng >= 124 && p.lng <= 132

const MODE_ICON: Record<RouteMode, ReactNode> = {
  TRANSIT: <TrainFront size={16} strokeWidth={2} aria-hidden />,
  CAR: <Car size={16} strokeWidth={2} aria-hidden />,
  WALK: <Footprints size={16} strokeWidth={2} aria-hidden />,
  BICYCLE: <Bike size={16} strokeWidth={2} aria-hidden />,
}

const STEP_ICON: Record<RouteStepType, ReactNode> = {
  DRIVE: <Car size={16} strokeWidth={2} aria-hidden />,
  WALK: <Footprints size={16} strokeWidth={2} aria-hidden />,
  BICYCLE: <Bike size={16} strokeWidth={2} aria-hidden />,
  BUS: <Bus size={16} strokeWidth={2} aria-hidden />,
  SUBWAY: <TrainFront size={16} strokeWidth={2} aria-hidden />,
}

function Frame({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  return (
    <main className="flex min-h-0 flex-1 flex-col bg-bg">
      <header className="flex shrink-0 items-center gap-1 pl-2 pr-4 pt-2">
        <button type="button" aria-label="뒤로" onClick={onBack} className="flex h-11 w-11 items-center justify-center text-ink">
          <ChevronLeft size={22} strokeWidth={2} aria-hidden />
        </button>
        <h1 className="text-[17px] font-extrabold">길찾기</h1>
      </header>
      {children}
    </main>
  )
}

interface StepItemProps {
  step: RouteStep
  /** 있으면 눌러서 지도에서 이 구간을 볼 수 있다 (자동차를 뺀 단계 중 좌표가 있는 것) */
  onSelect?: () => void
  selected?: boolean
}

function StepItem({ step, onSelect, selected = false }: StepItemProps) {
  const title = step.lineName ? `${STEP_LABEL[step.type]} ${step.lineName}` : STEP_LABEL[step.type]
  const body = (
    <>
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          selected ? 'bg-brand text-white' : 'bg-surface-2 text-ink-sub'
        }`}
      >
        {STEP_ICON[step.type]}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-bold">{title}</span>
        {step.guidance && <span className="text-sm leading-5 text-ink-sub">{step.guidance}</span>}
        <span className="text-xs text-ink-muted">
          {durationText(step.durationSeconds)} · {formatDistance(step.distanceMeters)}
          {onSelect && <span className="text-brand-text"> · {selected ? '전체 경로 보기' : '지도에서 보기'}</span>}
        </span>
      </div>
    </>
  )
  if (!onSelect) return <li className="flex gap-3 py-3">{body}</li>
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={`-mx-2 flex w-[calc(100%+16px)] gap-3 rounded-xl px-2 py-3 text-left ${selected ? 'bg-surface-2' : ''}`}
      >
        {body}
      </button>
    </li>
  )
}

/** 매장까지 길찾기. 출발지(현재 위치 또는 검색한 곳)와 이동 수단을 고르면 그 수단 하나만 조회한다 */
export default function StoreRoutePage() {
  const navigate = useNavigate()
  const { storeId: raw } = useParams()
  const storeId = raw && /^\d+$/.test(raw) && Number(raw) > 0 ? Number(raw) : null
  const detail = useStoreDetail(storeId)
  const { state, request } = useStoreRoute(storeId)

  const [mode, setMode] = useState<RouteMode>('TRANSIT')
  const [origin, setOrigin] = useState<Origin | null>(null)
  const [locating, setLocating] = useState(canLocate)
  const [originError, setOriginError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  /** 결과(seq)와 경로 번호를 함께 구분해, 새 결과나 다른 경로에 이전 선택이 넘어가지 않게 한다 */
  const [selection, setSelection] = useState<{ seq: number; index: number } | null>(null)
  const [focus, setFocus] = useState<{ seq: number; routeIndex: number; index: number; indices?: number[]; firstStep?: RouteStep } | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const rawRoutes = useMemo(() => state.status === 'success' && state.mode === mode
    ? [state.data, ...(mode === 'TRANSIT' && !isArrived(state.data) ? state.data.alternatives ?? [] : [])]
    : [], [state, mode])
  const result = state.status !== 'idle' && state.mode === mode ? state : null
  const selectedIndex = result?.status === 'success' && selection?.seq === result.seq && selection.index < rawRoutes.length
    ? selection.index : 0
  const originWalk = useOriginWalk(storeId, origin?.center ?? null, rawRoutes, selectedIndex)
  const routes = originWalk.routes
  const selectedRoute = routes[selectedIndex] ?? null

  const back = () => goBack(navigate, storeId ? `/stores/${storeId}` : '/stores')

  const chooseOrigin = (next: Origin) => {
    if (!inKorea(next.center)) {
      setOriginError('대한민국 안의 출발지만 길찾기를 할 수 있어요.')
      return
    }
    setOriginError(null)
    setOrigin(next)
    request(mode, next.center)
  }

  const locateOrigin = () => {
    setLocating(true)
    setOriginError(null)
    locateMe()
      .then((center) => chooseOrigin({ center, label: '현재 위치' }))
      .catch((error: unknown) => setOriginError(locateErrorMessage(error, '위치 권한이 꺼져 있어요. 출발지를 직접 검색해 주세요.')))
      .finally(() => setLocating(false))
  }

  // 처음 들어오면 현재 위치를 출발지로 한 번 제안한다 (GPS가 바뀔 때마다 다시 부르지 않는다)
  useEffect(() => {
    if (!canLocate()) return
    let cancelled = false
    locateMe()
      .then((center) => {
        if (!cancelled) chooseOrigin({ center, label: '현재 위치' })
      })
      .catch((error: unknown) => {
        if (!cancelled) setOriginError(locateErrorMessage(error, '위치 권한이 꺼져 있어요. 출발지를 직접 검색해 주세요.'))
      })
      .finally(() => {
        if (!cancelled) setLocating(false)
      })
    return () => {
      cancelled = true
    }
    // 처음 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const search = async (e: FormEvent) => {
    e.preventDefault()
    if (!query.trim() || searching) return
    setSearching(true)
    try {
      const hit = await searchPoint(query)
      if (hit) chooseOrigin({ center: hit.center, label: hit.label })
      else setOriginError('찾는 곳이 없어요. 역 이름이나 주소로 다시 검색해 주세요.')
    } catch {
      setOriginError('장소를 검색하지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSearching(false)
    }
  }

  const chooseMode = (next: RouteMode) => {
    setMode(next)
    if (origin) request(next, origin.center)
  }

  const store = detail.data
  const destination = useMemo(() => (store ? { lat: store.latitude, lng: store.longitude } : null), [store])

  if (storeId == null || (detail.error instanceof ApiError && (detail.error.status === 404 || detail.error.status === 400))) {
    return (
      <Frame onBack={back}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm leading-[22px] text-ink-sub">이 매장은 지금 이용할 수 없어요.</p>
          <button
            type="button"
            onClick={() => navigate('/stores', { replace: true })}
            className="min-h-[52px] w-[260px] max-w-full rounded-2xl bg-brand text-base font-bold text-white"
          >
            다른 매장 찾기
          </button>
        </div>
      </Frame>
    )
  }

  if (!store || !destination) {
    return (
      <Frame onBack={back}>
        {detail.isError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-ink-sub">매장 정보를 불러오지 못했어요.</p>
            <button
              type="button"
              onClick={() => void detail.refetch()}
              className="h-10 rounded-full bg-surface px-3.5 text-sm font-semibold text-ink"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <div role="status" aria-label="매장 정보를 불러오는 중" className="flex flex-col gap-4 px-4 pt-2">
            <div className="tm-pulse h-[120px] rounded-card bg-surface" />
            <div className="tm-pulse h-[260px] rounded-card bg-surface" />
          </div>
        )}
      </Frame>
    )
  }

  const kakaoLink = (
    <a
      href={kakaoRouteUrl(store)}
      target="_blank"
      rel="noreferrer"
      className="flex h-10 items-center gap-1 rounded-full bg-surface px-3.5 text-sm font-semibold text-ink no-underline"
    >
      카카오맵에서 보기
      <ExternalLink size={14} strokeWidth={2} aria-hidden />
    </a>
  )

  const focusIndex = result?.status === 'success' && focus?.seq === result.seq && focus.routeIndex === selectedIndex && focus.firstStep === selectedRoute?.steps[0] ? focus.index : null
  const focusedIndices = focusIndex != null ? focus?.indices ?? [focusIndex] : []
  const selectRoute = (index: number) => {
    if (result?.status !== 'success') return
    setSelection({ seq: result.seq, index })
    setFocus(null)
  }
  /** 단계를 누르면 그 구간을 지도에 보여 주고, 다시 누르면 전체 경로로 돌아간다. 목록이 길면 지도가 보이게 올린다 */
  const selectStep = (seq: number, index: number) => {
    const next = focusIndex === index ? null : { seq, routeIndex: selectedIndex, index, firstStep: selectedRoute?.steps[0] }
    setFocus(next)
    if (next) mapRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }
  const selectTransitSteps = (indices: number[]) => {
    if (result?.status !== 'success' || !indices.length) return
    const same = indices.length === focusedIndices.length && indices.every((index) => focusedIndices.includes(index))
    setFocus(same ? null : { seq: result.seq, routeIndex: selectedIndex, index: indices[0], indices, firstStep: selectedRoute?.steps[0] })
    if (!same) mapRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }

  return (
    <Frame onBack={back}>
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-16 pt-2">
        <section className="flex flex-col gap-2 rounded-card bg-surface p-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-8 shrink-0 font-bold text-ink-sub">출발</span>
            <span className="min-w-0 flex-1 truncate font-semibold">
              {origin ? origin.label : locating ? '현재 위치를 찾는 중…' : '출발지를 골라 주세요'}
            </span>
            {canLocate() && (
              <button
                type="button"
                onClick={locateOrigin}
                disabled={locating}
                className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-surface-2 px-3 text-xs font-bold text-ink disabled:opacity-50"
              >
                <LocateFixed size={14} strokeWidth={2} aria-hidden />
                현재 위치
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-8 shrink-0 font-bold text-ink-sub">도착</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{store.name}</span>
          </div>
          {/* 출발지 검색창은 이동 수단과 상관없이 항상 펼쳐 둔다 (대중교통만 접혀 있던 것을 통일) */}
          {hasKakaoKey && (
            <form onSubmit={(e) => void search(e)} className="mt-1 flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="출발지 검색 (역 이름, 주소)"
                aria-label="출발지 검색"
                className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 text-sm"
              />
              <button
                type="submit"
                disabled={searching || !query.trim()}
                className="h-10 shrink-0 rounded-xl bg-inverse px-3.5 text-sm font-bold text-inverse-ink disabled:opacity-50"
              >
                검색
              </button>
            </form>
          )}
          {originError && (
            <p role="alert" className="text-[13px] leading-5 text-danger">
              {originError}
            </p>
          )}
        </section>

        <div role="group" aria-label="이동 수단" className="grid grid-cols-4 gap-1.5">
          {ROUTE_MODES.map(({ mode: m, label }) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => chooseMode(m)}
              className={`flex h-11 items-center justify-center gap-1 rounded-xl text-[13px] font-bold ${
                mode === m ? 'bg-brand text-white' : 'bg-surface text-ink'
              }`}
            >
              {MODE_ICON[m]}
              {label}
            </button>
          ))}
        </div>

        {origin && (
          <div ref={mapRef} className="scroll-mt-4">
            <RouteMap
              origin={origin.center}
              destination={destination}
              route={selectedRoute}
              fitKey={result?.status === 'success' ? result.seq : 0}
              focusIndex={focusIndex}
              focusIndices={mode === 'TRANSIT' ? focusedIndices : undefined}
              routes={mode === 'TRANSIT' ? routes : undefined}
              selectedIndex={selectedIndex}
              onSelectRoute={selectRoute}
            />
          </div>
        )}

        {routes.length > 1 && <RouteAlternatives routes={routes} selectedIndex={selectedIndex} onSelect={selectRoute} />}

        {result?.status === 'loading' && (
          <div role="status" aria-label="경로를 찾는 중" className="flex flex-col gap-2">
            <div className="tm-pulse h-16 rounded-card bg-surface" />
            <div className="tm-pulse h-24 rounded-card bg-surface" />
          </div>
        )}

        {result?.status === 'success' && selectedRoute &&
          (isArrived(selectedRoute) ? (
            <p className="rounded-card bg-surface p-4 text-center text-[15px] font-semibold">이미 매장 근처에 있어요.</p>
          ) : (
            <section aria-label="선택한 경로 안내" className="flex flex-col rounded-card bg-surface px-4 pb-2 pt-4">
              {mode === 'TRANSIT' && <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold">이동 안내</h2>
                {focusIndex != null ? <button type="button" onClick={() => setFocus(null)} className="min-h-8 text-xs font-bold text-brand-text">전체 경로</button>
                  : <span className="text-xs text-ink-muted">구간을 눌러 지도 확인</span>}
              </div>}
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-2xl font-extrabold tracking-[-0.5px]">{durationText(selectedRoute.durationSeconds)}</span>
                <span className="text-sm text-ink-sub">{formatDistance(selectedRoute.distanceMeters)}</span>
                {fareText(selectedRoute.fare) && <span className="text-sm text-ink-sub">· {fareText(selectedRoute.fare)}</span>}
                {transfersText(selectedRoute.transfers) && (
                  <span className="text-sm text-ink-sub">· {transfersText(selectedRoute.transfers)}</span>
                )}
              </div>
              {origin && needsOriginWalkCheck(selectedRoute, origin.center) && (
                <p className="mt-2 text-xs leading-5 text-ink-sub">
                  {originWalk.status === 'loading' ? '첫 정류장까지 도보를 찾는 중…' : originWalk.status === 'error' ? '출발 도보를 불러오지 못했어요.' : '첫 정류장까지 도보는 별도 확인해 주세요.'}
                  {originWalk.status === 'error' && routeErrorView(originWalk.error, 'WALK').canRetry && <button type="button" onClick={originWalk.retry} className="ml-2 min-h-8 font-bold text-brand-text">도보 다시 시도</button>}
                </p>
              )}
              {mode === 'TRANSIT' ? <TransitSteps key={`${result.seq}:${selectedIndex}`} steps={selectedRoute.steps} focusedIndices={focusedIndices} onSelect={selectTransitSteps} /> : <ol aria-label="단계별 안내" className="mt-1 divide-y divide-surface-2">
                {selectedRoute.steps.map((step, i) => (
                  <StepItem
                    key={i}
                    step={step}
                    selected={focusIndex === i}
                    onSelect={isFocusable(step) ? () => selectStep(result.seq, i) : undefined}
                  />
                ))}
              </ol>}
            </section>
          ))}

        {result?.status === 'error' &&
          (() => {
            const view = routeErrorView(result.error, mode)
            return (
              <section role="alert" className="flex flex-col items-center gap-3 rounded-card bg-surface p-5 text-center">
                <p className="text-sm leading-[22px] text-ink">{view.message}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {view.canRetry && origin && (
                    <button
                      type="button"
                      onClick={() => request(mode, origin.center)}
                      className="h-10 rounded-full bg-inverse px-3.5 text-sm font-bold text-inverse-ink"
                    >
                      다시 시도
                    </button>
                  )}
                  {view.storeGone ? (
                    <button
                      type="button"
                      onClick={() => navigate('/stores', { replace: true })}
                      className="h-10 rounded-full bg-brand px-3.5 text-sm font-bold text-white"
                    >
                      다른 매장 찾기
                    </button>
                  ) : (
                    kakaoLink
                  )}
                </div>
                {view.suggestOtherMode && <p className="text-xs text-ink-muted">위에서 다른 이동 수단을 고를 수 있어요.</p>}
              </section>
            )
          })()}

        {!origin && !locating && <div className="flex justify-center pt-2">{kakaoLink}</div>}
      </div>
    </Frame>
  )
}
