import { fireEvent, render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StoreRoute } from '../../../api/stores'

const sdk = vi.hoisted(() => {
  const setBounds = vi.fn()
  const lineMaps: ReturnType<typeof vi.fn>[] = []
  const overlayMaps: ReturnType<typeof vi.fn>[] = []
  const overlayContents: HTMLElement[] = []
  const polyline = vi.fn(function () {
    const setMap = vi.fn()
    lineMaps.push(setMap)
    return { setMap }
  })
  return {
    setBounds, lineMaps, overlayMaps, overlayContents, polyline,
    maps: {
      LatLng: class { lat: number; lng: number; constructor(lat: number, lng: number) { this.lat = lat; this.lng = lng } },
      LatLngBounds: class { extend = vi.fn() },
      Map: class { setBounds = setBounds },
      Polyline: polyline,
      event: { addListener: vi.fn(), removeListener: vi.fn() },
      CustomOverlay: class {
        setMap = vi.fn()
        constructor(options: { content: HTMLElement }) { overlayMaps.push(this.setMap); overlayContents.push(options.content) }
      },
    },
  }
})

vi.mock('../kakao/loadKakao', () => ({ hasKakaoKey: true, loadKakao: async () => sdk.maps }))

import RouteMap from './RouteMap'

beforeEach(() => {
  vi.clearAllMocks()
  sdk.lineMaps.length = 0
  sdk.overlayMaps.length = 0
  sdk.overlayContents.length = 0
})

describe('경로 지도', () => {
  it('다른 경로는 옅게 두고 선택 경로 말풍선 하나만 표시하며 선 선택과 리스너 정리를 유지한다', async () => {
    const makeRoute = (lat: number): StoreRoute => ({
      mode: 'TRANSIT', distanceMeters: 1000, durationSeconds: 600, fare: 1500, transfers: 0,
      steps: [{type: 'BUS', lineName: '148', guidance: null, distanceMeters: 1000, durationSeconds: 600,
        path: [{latitude: lat, longitude: 127}, {latitude: lat + 0.01, longitude: 127.01}]}],
    })
    const first = makeRoute(37.5)
    const other = makeRoute(37.6)
    const routes = [first, other]
    const onSelect = vi.fn()
    const props = {origin: {lat:37.5,lng:127}, destination: {lat:37.7,lng:127.1}, routes, onSelectRoute: onSelect}
    const view = render(<RouteMap {...props} route={first} selectedIndex={0} fitKey="1:0" />)
    await waitFor(() => expect(sdk.polyline).toHaveBeenCalledTimes(2))
    expect(sdk.polyline.mock.calls[0]).toEqual([expect.objectContaining({strokeOpacity:0.3, zIndex:0})])
    expect(sdk.polyline.mock.calls[1]).toEqual([expect.objectContaining({strokeOpacity:0.95, zIndex:1})])
    const listener = sdk.maps.event.addListener.mock.calls[0]
    listener[2]()
    expect(onSelect).toHaveBeenLastCalledWith(1)
    expect(sdk.overlayContents.filter((el) => el.textContent?.includes(' · 10분'))).toHaveLength(1)
    expect(sdk.overlayContents.find((el) => el.textContent === '추천 · 10분')?.style.background).toContain('rgba')
    view.rerender(<RouteMap {...props} route={other} selectedIndex={1} fitKey="1:0" />)
    expect(sdk.setBounds).toHaveBeenCalledTimes(1)
    expect(sdk.maps.event.removeListener).toHaveBeenCalledWith(...listener)
    expect(sdk.polyline.mock.calls.at(-1)).toEqual([expect.objectContaining({
      strokeOpacity:0.95, path:[expect.objectContaining({lat:37.6}),expect.anything()],
    })])
    view.unmount()
    expect(sdk.maps.event.removeListener).toHaveBeenCalledTimes(2)
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('경로·구간·도보가 바뀌어도 지도 범위는 유지하고 명시적인 맞춤 버튼만 범위를 바꾼다', async () => {
    const origin = { lat: 37.5, lng: 127.0 }
    const destination = { lat: 37.6, lng: 127.1 }
    const first: StoreRoute = {
      mode: 'TRANSIT', distanceMeters: 5000, durationSeconds: 1500, fare: 1500, transfers: 0,
      steps: [{
        type: 'BUS', lineName: '148', guidance: null, distanceMeters: 5000, durationSeconds: 1500,
        path: [{ latitude: 37.51, longitude: 127.01 }, { latitude: 37.59, longitude: 127.09 }],
      }],
    }
    const other: StoreRoute = {
      ...first, originWalkIncluded: false,
      steps: [{ ...first.steps[0], lineName: '51', path: [
        { latitude: 37.52, longitude: 127.02 }, { latitude: 37.58, longitude: 127.08 },
      ] }],
    }
    const view = render(<RouteMap origin={origin} destination={destination} route={first} fitKey="1:0" focusIndex={0} />)
    await waitFor(() => expect(sdk.setBounds).toHaveBeenCalledTimes(1))
    const oldLines = [...sdk.lineMaps]
    const oldOverlays = [...sdk.overlayMaps]

    view.rerender(<RouteMap origin={origin} destination={destination} route={other} fitKey="1:0" />)
    expect(sdk.setBounds).toHaveBeenCalledTimes(1)
    oldLines.forEach((setMap) => expect(setMap).toHaveBeenLastCalledWith(null))
    oldOverlays.forEach((setMap) => expect(setMap).toHaveBeenLastCalledWith(null))
    expect(sdk.polyline).toHaveBeenCalledTimes(2)
    expect(sdk.polyline.mock.calls.at(-1)).toEqual([expect.objectContaining({
      path: [expect.objectContaining({ lat: 37.52, lng: 127.02 }), expect.objectContaining({ lat: 37.58, lng: 127.08 })],
    })])

    fireEvent.click(view.getByRole('button', {name:'전체 경로에 지도 맞추기'}))
    expect(sdk.setBounds).toHaveBeenCalledTimes(2)
    // 같은 선택을 다시 그릴 때는 사용자가 옮긴 지도를 되돌리지 않는다
    view.rerender(<RouteMap origin={{ ...origin }} destination={destination} route={other} fitKey="1:0" />)
    expect(sdk.setBounds).toHaveBeenCalledTimes(2)
  })
})
