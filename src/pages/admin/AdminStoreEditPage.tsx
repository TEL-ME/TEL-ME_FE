import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleAlert, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { adminStoreApi, type AdminStoreDetail, type DayOfWeek, type StoreHours } from '../../api/admin'
import { ApiError } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Badge, Card, Chip, primaryBtn, secondaryBtn } from '../../features/admin/components/AdminUi'
import { formatAdminTime } from '../../lib/date'
import { showToast } from '../../stores/toastStore'

const DAYS: [DayOfWeek, string][] = [
  ['MONDAY', '월'], ['TUESDAY', '화'], ['WEDNESDAY', '수'], ['THURSDAY', '목'], ['FRIDAY', '금'], ['SATURDAY', '토'], ['SUNDAY', '일'],
]
const WEEKDAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

/** 새 매장 기본 영업시간: 평일 09:00–18:00, 주말 휴무 */
const DEFAULT_HOURS: StoreHours[] = DAYS.map(([d]) =>
  WEEKDAYS.includes(d) ? { dayOfWeek: d, openTime: '09:00', closeTime: '18:00', closed: false } : { dayOfWeek: d, openTime: null, closeTime: null, closed: true },
)

const hm = (t: string | null) => (t ? t.slice(0, 5) : '')
const field = 'h-11 rounded-xl border-[1.5px] border-line bg-surface px-3.5 text-[15px] font-normal text-ink outline-none focus:border-brand disabled:bg-surface-2'
const label = 'flex flex-col gap-2 text-[13px] font-bold text-ink-sub'

/** 매장 등록·수정 (/admin/stores/new, /admin/stores/:storeId) */
export default function AdminStoreEditPage() {
  const { storeId } = useParams()
  const id = storeId ? Number(storeId) : null
  const detail = useQuery({
    queryKey: ['admin', 'store', id],
    queryFn: () => adminStoreApi.get(id!),
    enabled: id != null,
    staleTime: 0,
  })

  if (id != null && detail.isPending) return <p className="text-sm text-ink-sub">불러오는 중…</p>
  if (id != null && !detail.data) {
    return (
      <p className="text-sm text-ink-sub">
        매장을 찾을 수 없어요. <Link to="/admin/stores" className="font-bold text-brand-strong underline">목록으로</Link>
      </p>
    )
  }
  // key: 다시 불러오면 폼을 최신 내용으로 새로 채운다
  return <StoreForm key={detail.data ? `${detail.data.storeId}-${detail.data.lockVersion}` : 'new'} store={detail.data ?? null} />
}

function StoreForm({ store }: { store: AdminStoreDetail | null }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const serviceTypes = useQuery({ queryKey: ['admin', 'store-service-types'], queryFn: adminStoreApi.serviceTypes, staleTime: 10 * 60_000 })

  const [name, setName] = useState(store?.name ?? '')
  const [address, setAddress] = useState(store?.address ?? '')
  const [phone, setPhone] = useState(store?.phone ?? '')
  const [regionCode, setRegionCode] = useState(store?.regionCode ?? '')
  const [lat, setLat] = useState(store ? String(store.latitude) : '')
  const [lng, setLng] = useState(store ? String(store.longitude) : '')
  const [hours, setHours] = useState<StoreHours[]>(() =>
    store
      ? DAYS.map(([d]) => {
          const h = store.hours.find((x) => x.dayOfWeek === d)
          return h ? { ...h, openTime: hm(h.openTime) || null, closeTime: hm(h.closeTime) || null } : { dayOfWeek: d, openTime: null, closeTime: null, closed: true }
        })
      : DEFAULT_HOURS,
  )
  const [services, setServices] = useState<string[]>(store?.services.map((s) => s.code) ?? [])
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)

  const closedDown = store?.status === 'CLOSED_DOWN'
  const readOnly = closedDown || busy

  const setDay = (day: DayOfWeek, patch: Partial<StoreHours>) =>
    setHours((prev) => prev.map((h) => (h.dayOfWeek === day ? { ...h, ...patch } : h)))

  const toggleClosed = (day: DayOfWeek, closed: boolean) =>
    setDay(day, closed ? { closed, openTime: null, closeTime: null } : { closed, openTime: '09:00', closeTime: '18:00' })

  /** 월요일 시간을 화~금에 그대로 */
  const copyMondayToWeekdays = () => {
    const mon = hours[0]
    setHours((prev) => prev.map((h) => (WEEKDAYS.includes(h.dayOfWeek) ? { ...mon, dayOfWeek: h.dayOfWeek } : h)))
  }

  const toggleService = (code: string) =>
    setServices((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))

  /** 서버 검증과 같은 규칙을 먼저 확인한다. 문제가 없으면 null */
  const validate = (): string | null => {
    if (!name.trim() || !address.trim()) return '매장 이름과 주소를 입력해 주세요'
    if (!/^\d{10}$/.test(regionCode.trim())) return '법정동코드는 숫자 10자리예요'
    const la = Number(lat)
    const lo = Number(lng)
    if (!lat.trim() || Number.isNaN(la) || la < 33 || la > 38.7) return '위도는 33.0 ~ 38.7 사이로 입력해 주세요'
    if (!lng.trim() || Number.isNaN(lo) || lo < 124.6 || lo > 132) return '경도는 124.6 ~ 132.0 사이로 입력해 주세요'
    const bad = hours.find((h) => !h.closed && (!h.openTime || !h.closeTime || h.openTime >= h.closeTime))
    if (bad) return `${DAYS.find(([d]) => d === bad.dayOfWeek)?.[1]}요일: 여는 시간이 닫는 시간보다 빨라야 해요`
    if (services.length === 0) return '취급 업무를 하나 이상 골라 주세요'
    return null
  }

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'stores'] })
    if (store) await queryClient.invalidateQueries({ queryKey: ['admin', 'store', store.storeId] })
  }

  /** 공통 오류 처리: 동시 수정(STORE409-1)은 배너로, 나머지는 메시지로 */
  const run = async (action: () => Promise<unknown>, done: string, after?: () => void) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      showToast(done)
      await refreshAll()
      after?.()
    } catch (e) {
      if (e instanceof ApiError && e.code === 'STORE409-1') setConflict(true)
      else setError(e instanceof ApiError ? e.message : '저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setBusy(false)
      setConfirmClose(false)
    }
  }

  const save = () => {
    const problem = validate()
    if (problem) return setError(problem)
    const body = {
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim() || null,
      regionCode: regionCode.trim(),
      // 서버가 소수 6자리까지 받는다
      latitude: Number(Number(lat).toFixed(6)),
      longitude: Number(Number(lng).toFixed(6)),
      hours,
      serviceCodes: services,
      lockVersion: store?.lockVersion,
    }
    if (store) void run(() => adminStoreApi.update(store.storeId, body), '매장 정보를 저장했어요')
    else
      void run(
        async () => {
          const created = await adminStoreApi.create(body)
          navigate(`/admin/stores/${created.storeId}`, { replace: true })
        },
        '매장을 등록했어요',
      )
  }

  const reload = async () => {
    setConflict(false)
    await queryClient.invalidateQueries({ queryKey: ['admin', 'store', store?.storeId] })
  }

  return (
    <div className={`mx-auto flex w-full flex-col gap-5 ${store ? 'max-w-[1180px]' : 'max-w-[880px]'}`}>
      <header className="flex flex-col gap-1">
        <p className="text-[13px] text-ink-sub">
          <Link to="/admin/stores" className="underline underline-offset-2">매장 관리</Link> › {store ? `#${store.storeId}` : '새 매장'}
        </p>
        <h1 className="text-[26px] font-extrabold leading-[34px] tracking-[-0.5px]">{store ? '매장 수정' : '매장 등록'}</h1>
      </header>

      {conflict && (
        <div role="alert" className="flex items-center gap-3 rounded-[14px] bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-strong">
          <CircleAlert size={18} aria-hidden className="shrink-0" />
          <span className="flex-1">다른 관리자가 먼저 수정해서 저장하지 못했어요. 최신 내용을 불러온 뒤 다시 고쳐 주세요.</span>
          <button type="button" onClick={reload} className="flex items-center gap-1.5 rounded-[10px] bg-surface px-3 py-1.5 text-ink">
            <RotateCw size={14} aria-hidden />
            최신 내용 불러오기
          </button>
        </div>
      )}
      {closedDown && (
        <p role="status" className="rounded-[14px] bg-surface-2 px-4 py-3 text-sm font-semibold text-ink-sub">
          폐점한 매장이라 정보를 바꿀 수 없어요. 기록으로만 볼 수 있어요.
        </p>
      )}

      <div className={store ? 'grid grid-cols-[minmax(0,1fr)_300px] items-start gap-6' : 'flex flex-col'}>
        <Card className="flex flex-col gap-5 p-6">
          <div className="grid grid-cols-2 gap-4">
            <label className={label}>
              매장 이름
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} disabled={readOnly} className={field} />
            </label>
            <label className={label}>
              <span>
                전화 <span className="font-normal text-ink-muted">(선택)</span>
              </span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} disabled={readOnly} placeholder="02-123-4567" className={field} />
            </label>
          </div>
          <label className={label}>
            주소
            <input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={255} disabled={readOnly} className={field} />
          </label>
          <div className="grid grid-cols-3 gap-4">
            <label className={label}>
              법정동코드
              <input
                value={regionCode}
                onChange={(e) => setRegionCode(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                maxLength={10}
                disabled={readOnly}
                placeholder="숫자 10자리"
                className={field}
              />
            </label>
            <label className={label}>
              위도
              <input value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" disabled={readOnly} placeholder="37.497942" className={field} />
            </label>
            <label className={label}>
              경도
              <input value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" disabled={readOnly} placeholder="127.027621" className={field} />
            </label>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 flex w-full items-center justify-between text-[13px] font-bold text-ink-sub">
              영업시간
              {!readOnly && (
                <button type="button" onClick={copyMondayToWeekdays} className="text-xs font-bold text-brand-strong underline underline-offset-2">
                  월요일 시간을 평일에 적용
                </button>
              )}
            </legend>
            <ul className="flex flex-col divide-y divide-line rounded-xl border-[1.5px] border-line">
              {DAYS.map(([d, dayLabel]) => {
                const h = hours.find((x) => x.dayOfWeek === d)!
                return (
                  <li key={d} className="flex items-center gap-3 px-3.5 py-2 text-sm">
                    <span className="w-6 font-bold">{dayLabel}</span>
                    <input
                      type="time"
                      aria-label={`${dayLabel}요일 여는 시간`}
                      value={h.openTime ?? ''}
                      disabled={readOnly || h.closed}
                      onChange={(e) => setDay(d, { openTime: e.target.value || null })}
                      className={`${field} h-9 w-[130px] px-2.5 text-sm`}
                    />
                    <span className="text-ink-muted">–</span>
                    <input
                      type="time"
                      aria-label={`${dayLabel}요일 닫는 시간`}
                      value={h.closeTime ?? ''}
                      disabled={readOnly || h.closed}
                      onChange={(e) => setDay(d, { closeTime: e.target.value || null })}
                      className={`${field} h-9 w-[130px] px-2.5 text-sm`}
                    />
                    <label className="ml-auto flex items-center gap-1.5 text-[13px] text-ink-sub">
                      <input type="checkbox" checked={h.closed} disabled={readOnly} onChange={(e) => toggleClosed(d, e.target.checked)} className="h-4 w-4 accent-brand" />
                      휴무
                    </label>
                  </li>
                )
              })}
            </ul>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13px] font-bold text-ink-sub">취급 업무 <span className="font-normal text-ink-muted">(1개 이상)</span></legend>
            {serviceTypes.isPending && <p className="text-sm text-ink-muted">불러오는 중…</p>}
            {serviceTypes.isError && <p className="text-sm text-danger">업무 목록을 불러오지 못했어요.</p>}
            <div className="flex flex-wrap gap-1.5">
              {serviceTypes.data?.map((t) => (
                <Chip key={t.code} on={services.includes(t.code)} onClick={() => !readOnly && toggleService(t.code)}>
                  {t.name}
                </Chip>
              ))}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="text-[13px] font-semibold text-danger">
              {error}
            </p>
          )}
          <div className="flex items-center gap-2">
            <span className="flex-1" />
            <Link to="/admin/stores" className={secondaryBtn}>
              {closedDown ? '목록으로' : '취소'}
            </Link>
            {!closedDown && (
              <button type="button" disabled={busy} onClick={save} className={primaryBtn}>
                {busy ? '저장 중…' : store ? '저장' : '등록'}
              </button>
            )}
          </div>
        </Card>

        {store && (
          <Card className="flex flex-col gap-3 p-5 text-sm">
            <h2 className="text-[15px] font-extrabold">이 매장의 기록</h2>
            <dl className="grid grid-cols-[80px_1fr] gap-y-2">
              <dt className="text-ink-muted">상태</dt>
              <dd>{closedDown ? <Badge tone="muted">폐점</Badge> : <Badge tone="success">영업</Badge>}</dd>
              <dt className="text-ink-muted">등록</dt>
              <dd>{formatAdminTime(store.createdAt)}</dd>
              <dt className="text-ink-muted">마지막 수정</dt>
              <dd>{formatAdminTime(store.updatedAt)}</dd>
            </dl>
            {!closedDown && (
              <button type="button" disabled={busy} onClick={() => setConfirmClose(true)} className={`${secondaryBtn} text-danger`}>
                폐점 처리
              </button>
            )}
            <p className="text-xs leading-[18px] text-ink-muted">폐점 처리하면 상담과 지도에서 빠져요. 목록의 상태 필터 ‘폐점’에서 다시 볼 수 있어요.</p>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={confirmClose}
        title="이 매장을 폐점 처리할까요?"
        confirmLabel="폐점 처리"
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => store && void run(() => adminStoreApi.remove(store.storeId), '매장을 폐점 처리했어요', () => navigate('/admin/stores'))}
      >
        상담 답변과 지도에 더는 나오지 않아요. 폐점한 매장은 정보를 바꿀 수 없어요.
      </ConfirmDialog>
    </div>
  )
}
