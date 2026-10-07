import { describe, expect, it } from 'vitest'
import { apiUrl } from './client'

describe('apiUrl', () => {
  it('빈 값은 빼고, 배열은 같은 이름을 반복해 붙인다', () => {
    expect(
      apiUrl('/api/v1/stores/nearby', {
        latitude: 37.5,
        longitude: 127,
        radiusMeters: undefined,
        serviceTypes: ['NEW_LINE', 'PORT_IN'],
      }),
    ).toBe('/api/v1/stores/nearby?latitude=37.5&longitude=127&serviceTypes=NEW_LINE&serviceTypes=PORT_IN')
  })

  it('값이 없으면 물음표를 붙이지 않는다', () => {
    expect(apiUrl('/api/v1/stores/service-types', { serviceTypes: undefined })).toBe('/api/v1/stores/service-types')
  })
})
