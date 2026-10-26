import { ChevronLeft, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { handOffQuestion, placeStoreQuestion, regionStoreQuestion } from '../features/chat/askHandoff'
import { goBack } from '../features/stores/goBack'
import { hasKakaoKey } from '../features/stores/kakao/loadKakao'
import { searchPlace } from '../features/stores/kakao/searchPlace'
import { useDistricts } from '../features/stores/queries'
import { SIDO_LIST, sidoOf, type Sido } from '../features/stores/regions'
import { setOrigin, useStoreSearch } from '../features/stores/storeSearchStore'

/** 장소 이름으로 찾았을 때 그 주변을 얼마나 볼지 */
const PLACE_RADIUS = 3_000
/** 시·군·구 대신 "전체"를 골랐다는 표시 */
const WHOLE = 'whole'

/** "서울 강남구"처럼 붙인다. 시·군·구가 없는 곳(세종)은 시·도 이름만 */
const regionLabel = (sido: Sido, district: string) => (district === sido.label ? sido.label : `${sido.label} ${district}`)

const choice = (on: boolean) =>
  `min-h-11 rounded-xl border-[1.5px] px-1 text-sm ${
    on ? 'border-brand bg-brand-soft font-bold text-brand-strong' : 'border-surface bg-surface font-medium text-ink'
  }`

/** 이 화면을 어디서 열었는지 (navigate의 state) */
interface RegionEntry {
  /** 상담에서 열었다: 고른 지역을 이 대화(주소)에 질문으로 보낸다 */
  askChat?: string
  /**
   * 지역을 되묻는 말에 답하는 중이다: 지역 이름만 보낸다.
   * 문장("… 찾아줘")으로 보내면 서버가 새 질문으로 보고, 앞서 말한 조건(유심 재발급 등)을 잇지 못한다.
   */
  asAnswer?: boolean
  /** 매장 화면에서 열었다: 고른 뒤 뒤로 돌아가면 된다 */
  fromStores?: boolean
}

/**
 * 지역으로 매장 찾기: 이름으로 검색하거나 시·도 → 시·군·구를 고른다.
 * 매장 화면에서 열면 고른 지역의 매장을 지도에 보여 주고, 상담에서 열면 그 지역 매장을 상담에 다시 묻는다.
 */
export default function StoreRegionPage() {
  const navigate = useNavigate()
  const entry = (useLocation().state as RegionEntry | null) ?? {}
  const chatPath = entry.askChat ?? null
  const origin = useStoreSearch((s) => s.origin)
  // 지금 지역으로 보고 있었다면 그 시·도를 펼쳐 둔다
  const [sido, setSido] = useState<Sido | null>(() =>
    origin.kind === 'region' && !origin.auto ? (sidoOf(origin.code) ?? null) : null,
  )
  const [pick, setPick] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const districts = useDistricts(sido?.code ?? null)

  const back = () => goBack(navigate, chatPath ?? '/stores')
  /** 고른 지역을 매장 화면에 보여 주러 간다. 매장 화면에서 온 게 아니면(주소로 바로 들어옴 등) 매장 화면을 새로 연다 */
  const showOnStores = () => (entry.fromStores ? back() : navigate('/stores', { replace: true }))
  /** 상담으로 돌아가 질문을 보낸다 */
  const askInChat = (question: string) => {
    if (!chatPath) return
    handOffQuestion(chatPath, question)
    back()
  }

  const keyword = query.trim()
  // 입력한 글자로 시·도와 (고른 시·도의) 시·군·구를 바로 추린다
  const hits = keyword
    ? [
        ...SIDO_LIST.filter((s) => s.label.includes(keyword) || s.name.includes(keyword)).map((s) => ({
          key: s.code,
          label: s.name,
          sub: '시·도',
          go: () => apply(s.code, s.label),
        })),
        ...(sido && districts.data
          ? districts.data.districts
              .filter((d) => d.name.includes(keyword))
              .map((d) => ({
                key: d.code,
                label: regionLabel(sido, d.name),
                sub: `${d.count}곳`,
                go: () => apply(d.code, regionLabel(sido, d.name)),
              }))
          : []),
      ]
    : []

  function apply(code: string, label: string) {
    if (chatPath) return askInChat(entry.asAnswer ? label : regionStoreQuestion(label))
    setOrigin({ kind: 'region', code, label })
    showOnStores()
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!keyword || searching) return
    // 지도 키가 없으면 주소·장소 검색을 못 한다. 추린 결과가 하나면 그곳으로 간다
    if (!hasKakaoKey) {
      if (hits.length === 1) hits[0].go()
      else setNotFound(hits.length === 0)
      return
    }
    setSearching(true)
    setNotFound(false)
    try {
      const hit = await searchPlace(keyword)
      if (!hit) setNotFound(true)
      else if (hit.kind === 'region') apply(hit.code, hit.label)
      else if (chatPath) askInChat(entry.asAnswer ? hit.label : placeStoreQuestion(hit.label))
      else {
        setOrigin({ kind: 'area', center: hit.center, radiusMeters: PLACE_RADIUS, label: hit.label })
        showOnStores()
      }
    } catch {
      setNotFound(true)
    } finally {
      setSearching(false)
    }
  }

  const picked = pick === WHOLE ? null : districts.data?.districts.find((d) => d.code === pick)
  // 상담에서 열었으면 지도에 보여 주는 대신 상담에 묻는다
  const verb = chatPath ? (entry.asAnswer ? '찾기' : '물어보기') : '보기'
  const applyLabel = !sido
    ? '시·도를 골라 주세요'
    : pick === WHOLE
      ? `${sido.label} 전체 매장 ${verb}`
      : picked
        ? `${regionLabel(sido, picked.name)} 매장 ${verb}`
        : '시·군·구를 골라 주세요'
  const canApply = sido != null && (pick === WHOLE || picked != null)

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-bg">
      <header className="flex shrink-0 items-center gap-2 pb-2 pl-2 pr-4 pt-3">
        <button type="button" aria-label="뒤로" onClick={back} className="flex h-11 w-11 shrink-0 items-center justify-center text-ink">
          <ChevronLeft size={22} strokeWidth={2} aria-hidden />
        </button>
        <form
          role="search"
          onSubmit={(e) => void onSubmit(e)}
          className="flex h-[46px] min-w-0 flex-1 items-center gap-2 rounded-full border-[1.5px] border-brand bg-surface px-3.5 text-ink-sub"
        >
          <Search size={18} strokeWidth={2} aria-hidden className="shrink-0" />
          <input
            type="search"
            enterKeyHint="search"
            aria-label={hasKakaoKey ? '지역이나 역 이름' : '지역 이름'}
            placeholder={hasKakaoKey ? '강남구, 강남역처럼 입력해 보세요' : '서울, 경기처럼 입력해 보세요'}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setNotFound(false)
            }}
            maxLength={50}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted [&::-webkit-search-cancel-button]:hidden"
          />
          {searching && <span className="tm-pulse shrink-0 text-xs font-semibold">찾는 중</span>}
        </form>
      </header>

      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2">
        <div className="flex flex-col gap-1 px-1">
          <h1 className="text-[22px] font-extrabold leading-[30px] tracking-[-0.4px]">지역으로 매장 찾기</h1>
          {chatPath && (
            <p className="text-[13px] leading-5 text-ink-sub">
              {entry.asAnswer ? '지역을 고르면 무러바라에게 답으로 보내요.' : '지역을 고르면 무러바라에게 그 지역 매장을 물어봐요.'}
            </p>
          )}
        </div>

        {(hits.length > 0 || notFound) && (
          <div className="rounded-card bg-surface px-3 py-1">
            {hits.map((h) => (
              <button
                key={h.key}
                type="button"
                onClick={h.go}
                className="flex min-h-[52px] w-full items-center gap-3 px-1 py-1.5 text-left text-[15px] font-semibold text-ink"
              >
                <span className="min-w-0 flex-1">{h.label}</span>
                <span className="text-[13px] font-medium text-ink-sub">{h.sub}</span>
              </button>
            ))}
            {notFound && (
              <p role="status" className="px-1 py-3.5 text-sm leading-[22px] text-ink-sub">
                그 이름으로는 지역을 찾지 못했어요. 아래에서 골라 주세요.
              </p>
            )}
          </div>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[13px] font-bold text-ink-sub">1. 시·도</h2>
          <div className="grid grid-cols-4 gap-1.5">
            {SIDO_LIST.map((s) => (
              <button
                key={s.code}
                type="button"
                aria-pressed={sido?.code === s.code}
                onClick={() => {
                  setSido(s)
                  setPick(null)
                }}
                className={choice(sido?.code === s.code)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        {sido && (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-[13px] font-bold text-ink-sub">
              2. 시·군·구 <span className="font-medium text-ink-muted">{sido.name}</span>
            </h2>
            {districts.isPending ? (
              <p role="status" className="tm-pulse rounded-2xl bg-surface px-4 py-3.5 text-sm text-ink-sub">
                불러오는 중…
              </p>
            ) : districts.isError ? (
              <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3">
                <p className="min-w-0 flex-1 text-sm leading-[22px] text-ink-sub">지역 목록을 불러오지 못했어요.</p>
                <button
                  type="button"
                  onClick={() => void districts.refetch()}
                  className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-bold text-ink"
                >
                  다시 시도
                </button>
              </div>
            ) : districts.data.districts.length === 0 ? (
              <p className="rounded-2xl bg-surface px-4 py-3.5 text-sm leading-[22px] text-ink-sub">이 지역에는 아직 매장이 없어요.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-1.5">
                  <button type="button" aria-pressed={pick === WHOLE} onClick={() => setPick(WHOLE)} className={choice(pick === WHOLE)}>
                    전체 <span className="text-xs font-medium opacity-70">{districts.data.total}</span>
                  </button>
                  {districts.data.districts.map((d) => (
                    <button
                      key={d.code}
                      type="button"
                      aria-pressed={pick === d.code}
                      onClick={() => setPick(d.code)}
                      className={choice(pick === d.code)}
                    >
                      {d.name} <span className="text-xs font-medium opacity-70">{d.count}</span>
                    </button>
                  ))}
                </div>
                <p className="px-1 text-xs leading-[18px] text-ink-muted">
                  매장이 있는 시·군·구만 보여요.{districts.data.partial ? ' 매장이 많아 일부만 보일 수 있어요.' : ''}
                </p>
              </>
            )}
          </section>
        )}
      </div>

      <div className="shrink-0 bg-bg px-4 py-2.5">
        <button
          type="button"
          disabled={!canApply}
          onClick={() => {
            if (!sido) return
            if (pick === WHOLE) apply(sido.code, sido.label)
            else if (picked) apply(picked.code, regionLabel(sido, picked.name))
          }}
          className="min-h-[52px] w-full rounded-2xl bg-brand text-base font-bold text-white disabled:bg-field-disabled disabled:text-ink-muted"
        >
          {applyLabel}
        </button>
      </div>
    </main>
  )
}
