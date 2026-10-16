import { describe, expect, it } from 'vitest'
import { groupInquiries } from './endSummaryFormat'

describe('groupInquiries', () => {
  it('같은 제목은 한 문단으로 묶고, 처음 나온 순서를 지킨다', () => {
    const groups = groupInquiries([
      { title: '요금제 문의', text: 'LTE 플러스로 바꾸면 월 42,000원 아낄 수 있어요.' },
      { title: '요금제 변경 문의', text: '다음 날 00:00부터 적용됩니다.' },
      { title: '요금제 문의', text: '안내받은 내용: 기본 데이터를 다 쓰면 400kbps로 제한됩니다.' },
      { title: '요금제 문의', text: 'LTE 플러스로 바꾸면 월 42,000원 아낄 수 있어요.' },
    ])
    expect(groups).toEqual([
      {
        title: '요금제 문의',
        texts: ['LTE 플러스로 바꾸면 월 42,000원 아낄 수 있어요.', '기본 데이터를 다 쓰면 400kbps로 제한됩니다.'],
      },
      { title: '요금제 변경 문의', texts: ['다음 날 00:00부터 적용됩니다.'] },
    ])
  })

  it('제목이나 내용이 빈 항목은 뺀다', () => {
    expect(groupInquiries([{ title: ' ', text: '내용' }, { title: '유심', text: '  ' }])).toEqual([])
  })
})
