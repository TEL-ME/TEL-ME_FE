import { ChevronRight, MapIcon, MapPin } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { StoreSearchContext } from '../../../api/types'
import { formatDistance, formatRadius } from '../../stores/format'
import type { StoreListItem } from '../../stores/queries'
import { showStoresFromChat } from '../../stores/storeSearchStore'

/**
 * 매장 안내 답변(STORE_RESULT)의 매장 카드 (백엔드 ChatStoreResponse).
 * 예전에 저장된 메시지는 값이 일부만 있을 수 있어서(예: {storeId, name}) 있는 값만 골라 보여 준다.
 */
interface StoreSnapshot {
  storeId?: number
  name?: string
  address?: string
  latitude?: number
  longitude?: number
  distanceMeters?: number
  services?: { name?: string }[]
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : undefined)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

function normalize(raw: Record<string, unknown>): StoreSnapshot {
  return {
    storeId: num(raw.storeId),
    name: str(raw.name),
    address: str(raw.address),
    latitude: num(raw.latitude),
    longitude: num(raw.longitude),
    distanceMeters: num(raw.distanceMeters),
    services: Array.isArray(raw.services) ? (raw.services as { name?: string }[]) : undefined,
  }
}

/** 지도에 올릴 수 있는 매장만 (번호와 좌표가 모두 있어야 한다) */
function toMapStores(stores: StoreSnapshot[]): StoreListItem[] {
  return stores.flatMap((s) =>
    s.storeId != null && s.name && s.latitude != null && s.longitude != null
      ? [
          {
            storeId: s.storeId,
            name: s.name,
            address: s.address ?? '',
            latitude: s.latitude,
            longitude: s.longitude,
            distanceMeters: s.distanceMeters ?? null,
          },
        ]
      : [],
  )
}

interface StoreResultsProps {
  items: Record<string, unknown>[]
  /** 매장을 찾은 기준. 예전 메시지에는 없다 */
  context?: StoreSearchContext | null
}

/** 카드 목록 위 제목: 어디를 기준으로 찾았는지 (예: 현재 위치 기준 · 반경 10km). 지역 전체 검색은 반경이 없다 */
function contextTitle(context: StoreSearchContext): string {
  return context.radiusMeters != null ? `${context.label} 기준 · 반경 ${formatRadius(context.radiusMeters)}` : `${context.label} 기준`
}

const action = 'flex min-h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-[13px] font-bold text-ink no-underline'

export default function StoreResults({ items, context }: StoreResultsProps) {
  const navigate = useNavigate()
  const stores = items.map(normalize).filter((s) => s.name)
  if (stores.length === 0) return null
  const hasDistance = stores.some((s) => s.distanceMeters != null)
  const mapStores = toMapStores(stores)
  /** 거리를 잰 곳의 이름 */
  const basis = context?.label ?? '검색한 곳'

  const openMap = () => {
    showStoresFromChat(basis, mapStores)
    navigate('/stores')
  }

  return (
    <div className="mt-2.5 flex flex-col gap-1.5">
      {context && (
        <p className="flex items-center gap-1 text-[13px] font-bold leading-[18px] text-ink-sub">
          <MapPin size={14} strokeWidth={2} aria-hidden className="shrink-0" />
          {contextTitle(context)}
        </p>
      )}
      {stores.map((s, i) => (
        <Link
          key={s.storeId ?? i}
          to={s.storeId ? `/stores/${s.storeId}` : '/stores'}
          className="flex items-center gap-2 rounded-xl bg-surface-2 py-2.5 pl-3 pr-2.5 text-ink no-underline"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-baseline gap-1.5">
              <b className="min-w-0 flex-1 text-sm leading-5">{s.name}</b>
              {s.distanceMeters != null && (
                <span className="shrink-0 text-[13px] font-bold text-brand-text">{formatDistance(s.distanceMeters)}</span>
              )}
            </span>
            {s.address && <span className="text-xs leading-[17px] text-ink-sub">{s.address}</span>}
            {s.services && s.services.length > 0 && (
              <span className="mt-1 flex flex-wrap gap-1">
                {s.services.map((sv, j) =>
                  sv.name ? (
                    <span key={j} className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-strong">
                      {sv.name}
                    </span>
                  ) : null,
                )}
              </span>
            )}
          </span>
          <ChevronRight size={16} strokeWidth={2} aria-hidden className="shrink-0 text-ink-muted" />
        </Link>
      ))}
      {hasDistance && (
        <p className="mt-1 text-xs leading-[18px] text-ink-muted">
          {context ? `거리는 ${context.label}에서 잰 직선거리예요.` : '거리는 직선거리예요.'}
        </p>
      )}
      <div className="mt-1.5 flex flex-wrap gap-2">
        {mapStores.length > 0 && (
          <button type="button" onClick={openMap} className={action}>
            <MapIcon size={15} strokeWidth={2} aria-hidden />
            지도로 보기
          </button>
        )}
        <Link to="/stores/region" className={action}>
          다른 지역으로 찾기
        </Link>
      </div>
    </div>
  )
}
