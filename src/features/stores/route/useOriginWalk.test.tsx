import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { storeApi, type StoreRoute } from '../../../api/stores'
import { useOriginWalk } from './useOriginWalk'

vi.mock('../../../api/stores', () => ({ storeApi: { originWalk: vi.fn() } }))

const origin = { lat: 37.5, lng: 127 }
const route = (lat: number): StoreRoute => ({
  mode: 'TRANSIT', distanceMeters: 5000, durationSeconds: 1500, fare: 1500, transfers: 1, originWalkIncluded: false,
  steps: [{ type: 'BUS', lineName: '148', guidance: null, distanceMeters: 5000, durationSeconds: 1500,
    path: [{ latitude: lat, longitude: 127.01 }, { latitude: 37.6, longitude: 127.1 }] }],
})
const routes = [route(37.51), route(37.52), route(37.51)]
const walk: StoreRoute = { mode: 'WALK', distanceMeters: 120, durationSeconds: 100, fare: null, transfers: null,
  steps: [{type:'WALK',lineName:null,guidance:'첫 정류장까지 걷기',distanceMeters:120,durationSeconds:100,
    path:[{latitude:37.5,longitude:127},{latitude:37.51,longitude:127.01}]}] }

beforeEach(() => { vi.resetAllMocks(); vi.mocked(storeApi.originWalk).mockResolvedValue(walk) })

describe('선택 경로 출발 도보', () => {
  it('선택할 때만 조회하고 재선택·같은 정류장 경로는 성공 응답을 재사용하며 중복으로 붙이지 않는다', async () => {
    const {result,rerender} = renderHook(({index}) => useOriginWalk(101,origin,routes,index), {initialProps:{index:0}})
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(storeApi.originWalk).toHaveBeenCalledTimes(1)
    expect(result.current.routes[0]).toMatchObject({distanceMeters:5120,durationSeconds:1600,originWalkIncluded:true,fare:1500})
    expect(result.current.routes[0].steps).toHaveLength(2)
    rerender({index:1})
    await waitFor(() => expect(result.current.status).toBe('success'))
    rerender({index:0})
    rerender({index:2})
    expect(storeApi.originWalk).toHaveBeenCalledTimes(2)
    expect(result.current.routes[0].steps).toHaveLength(2)
    expect(result.current.routes[2].steps).toHaveLength(2)
    expect(routes[0].steps).toHaveLength(1)
  })

  it('진행 중 경로를 다시 선택해도 요청은 합치고 늦은 응답은 해당 경로에만 붙인다', async () => {
    const releases: ((value:StoreRoute)=>void)[] = []
    vi.mocked(storeApi.originWalk).mockImplementation(() => new Promise((resolve) => releases.push(resolve)))
    const {result,rerender} = renderHook(({index}) => useOriginWalk(101,origin,routes,index), {initialProps:{index:0}})
    await waitFor(() => expect(releases).toHaveLength(1))
    rerender({index:1})
    await waitFor(() => expect(releases).toHaveLength(2))
    rerender({index:0})
    await act(async () => releases[1]({...walk,distanceMeters:240}))
    expect(result.current.status).toBe('loading')
    expect(result.current.routes[0].distanceMeters).toBe(5000)
    await act(async () => releases[0](walk))
    expect(result.current.routes[0].distanceMeters).toBe(5120)
    expect(result.current.routes[1].distanceMeters).toBe(5240)
    expect(storeApi.originWalk).toHaveBeenCalledTimes(2)
  })

  it('실패는 재선택으로 자동 재시도하지 않고 명시적 재시도 연타도 한 번으로 합친다', async () => {
    vi.mocked(storeApi.originWalk).mockRejectedValueOnce(new Error('unavailable'))
    const {result,rerender} = renderHook(({index}) => useOriginWalk(101,origin,routes,index), {initialProps:{index:0}})
    await waitFor(() => expect(result.current.status).toBe('error'))
    rerender({index:2})
    expect(storeApi.originWalk).toHaveBeenCalledTimes(1)
    expect(result.current.routes[0]).toBe(routes[0])
    await act(async () => { result.current.retry(); result.current.retry() })
    expect(storeApi.originWalk).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('success')
  })

  it('출발지 변경·종료 시 요청을 취소하고 이전 출발지의 늦은 응답은 버린다', async () => {
    const releases: ((value:StoreRoute)=>void)[] = []
    vi.mocked(storeApi.originWalk).mockImplementation(() => new Promise((resolve) => releases.push(resolve)))
    const {result,rerender,unmount} = renderHook(({lat}) => useOriginWalk(101,{lat,lng:127},routes,0), {initialProps:{lat:37.5}})
    await waitFor(() => expect(releases).toHaveLength(1))
    const firstSignal=vi.mocked(storeApi.originWalk).mock.calls[0][2]!
    rerender({lat:37.49})
    await waitFor(() => expect(releases).toHaveLength(2))
    expect(firstSignal.aborted).toBe(true)
    await act(async () => releases[0](walk))
    expect(result.current.routes[0]).toBe(routes[0])
    expect(result.current.status).toBe('loading')
    const signal=vi.mocked(storeApi.originWalk).mock.calls[1][2]!
    unmount()
    expect(signal.aborted).toBe(true)
  })

  it('보강된 응답·출발지 옆의 경로·자동차는 조회하지 않고 StrictMode에서도 중복 호출하지 않는다', async () => {
    const skip = [{...routes[0],originWalkIncluded:true},route(37.5)]
    skip[1].steps = [{...skip[1].steps[0],path:[{latitude:37.5,longitude:127}]}]
    const {rerender} = renderHook(({index}) => useOriginWalk(101,origin,skip,index), {initialProps:{index:0}})
    rerender({index:1})
    await act(async () => {})
    expect(storeApi.originWalk).not.toHaveBeenCalled()
    renderHook(() => useOriginWalk(101,origin,routes,0), {wrapper:({children}:{children:ReactNode}) => <StrictMode>{children}</StrictMode>})
    await waitFor(() => expect(storeApi.originWalk).toHaveBeenCalledTimes(1))
  })
})
