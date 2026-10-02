import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * 매장 추천 답변(STORE_RESULT)의 매장 카드.
 * 백엔드 스냅샷 모양이 아직 확정 전이라(예: {storeId, name}) 있는 값만 골라 보여 준다.
 */
interface StoreSnapshot {
  storeId?: number
  name?: string
  address?: string
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
    distanceMeters: num(raw.distanceMeters),
    services: Array.isArray(raw.services) ? (raw.services as { name?: string }[]) : undefined,
  }
}

const formatDistance = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10}m` : `${(m / 1000).toFixed(1)}km`)

export default function StoreResults({ items }: { items: Record<string, unknown>[] }) {
  const stores = items.map(normalize).filter((s) => s.name)
  if (stores.length === 0) return null
  const hasDistance = stores.some((s) => s.distanceMeters != null)

  return (
    <div className="mt-2.5 flex flex-col gap-1.5">
      {stores.map((s, i) => (
        <Link
          key={s.storeId ?? i}
          to={s.storeId ? `/stores?storeId=${s.storeId}` : '/stores'}
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
      {hasDistance && <p className="mt-1 text-xs leading-[18px] text-ink-muted">거리는 직선거리예요.</p>}
    </div>
  )
}
