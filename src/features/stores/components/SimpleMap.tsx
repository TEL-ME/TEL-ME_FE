import type { LatLng } from '../format'
import type { StoreMapProps } from './mapTypes'

/** 가장자리에 붙지 않게 두는 여백 (전체 폭·높이에 대한 비율) */
const PAD = 0.14

function Pin({ selected }: { selected: boolean }) {
  return (
    <svg width={selected ? 38 : 30} height={selected ? 48 : 38} viewBox="-15 -36 30 38" aria-hidden className="block">
      <path
        d="M0 0C-4-8-12-12-12-21A12 12 0 1 1 12-21C12-12 4-8 0 0z"
        className={selected ? 'fill-ink' : 'fill-brand'}
        stroke="#fff"
        strokeWidth="2.5"
      />
      <circle cy="-21" r="4.5" fill="#fff" />
    </svg>
  )
}

/**
 * 카카오 지도를 쓸 수 없을 때(키 없음·불러오기 실패)의 간이 지도.
 * 지도 그림 없이 매장끼리의 상대 위치만 보여 준다. 옮기거나 확대할 수 없다.
 */
export default function SimpleMap({
  stores,
  selectedId,
  me,
  anchor,
  bottomInset,
  topInset = 0,
  interactive = true,
  label,
  onSelect,
}: StoreMapProps) {
  const points: LatLng[] = stores.map((s) => ({ lat: s.latitude, lng: s.longitude }))
  if (anchor) points.push(anchor)

  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  // 한 곳뿐이면 가운데에 둔다
  const x = (lng: number) => (maxLng === minLng ? 50 : (PAD + ((lng - minLng) / (maxLng - minLng)) * (1 - PAD * 2)) * 100)
  const y = (lat: number) => (maxLat === minLat ? 50 : (PAD + ((maxLat - lat) / (maxLat - minLat)) * (1 - PAD * 2)) * 100)

  // 내 위치는 지금 보여 주는 범위 안에 있을 때만 그린다 (다른 지역을 보는 중이면 화면 밖이다)
  const showMe = me != null && me.lat >= minLat && me.lat <= maxLat && me.lng >= minLng && me.lng <= maxLng

  return (
    <div
      role={interactive ? 'group' : 'img'}
      aria-label={label}
      className="absolute inset-0 bg-surface-2"
      style={{
        backgroundImage:
          'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}
      onClick={interactive ? () => onSelect?.(null) : undefined}
    >
      <div className="absolute inset-x-0" style={{ top: topInset, bottom: bottomInset }}>
        {me && showMe && (
          <span
            aria-hidden
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-notice-text shadow-[0_0_0_9px_rgba(106,79,143,0.18)]"
            style={{ left: `${x(me.lng)}%`, top: `${y(me.lat)}%` }}
          />
        )}
        {stores.map((s) => {
          const on = s.storeId === selectedId
          const style = { left: `${x(s.longitude)}%`, top: `${y(s.latitude)}%`, zIndex: on ? 2 : 1 }
          const body = (
            <>
              {on && (
                <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-inverse px-[11px] py-[5px] text-xs font-bold text-inverse-ink">
                  {s.name}
                </span>
              )}
              <Pin selected={on} />
            </>
          )
          return interactive ? (
            <button
              key={s.storeId}
              type="button"
              aria-label={s.name}
              aria-pressed={on}
              onClick={(e) => {
                e.stopPropagation()
                onSelect?.(s.storeId)
              }}
              className="absolute -translate-x-1/2 -translate-y-full"
              style={style}
            >
              {body}
            </button>
          ) : (
            <span key={s.storeId} className="absolute -translate-x-1/2 -translate-y-full" style={style}>
              {body}
            </span>
          )
        })}
      </div>
      {interactive && (
        <p
          className="absolute left-4 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-sub"
          style={{ bottom: bottomInset + 12 }}
        >
          지도를 불러올 수 없어 위치만 간단히 보여요
        </p>
      )}
    </div>
  )
}
