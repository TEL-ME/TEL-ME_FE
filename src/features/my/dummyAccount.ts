/**
 * 마이 화면 임시 데이터 — 요금·사용량 API가 생기기 전까지 시안 모양을 보여 주려고 넣은 값.
 * 화면에는 모두 "(임시)"를 붙인다. API가 생기면 이 파일을 지우고 실제 값으로 바꾼다.
 */
export const DUMMY_ACCOUNT = {
  plan: '5G 요금제',
  monthlyFee: 68_000,
  feeDiff: -3_200, // 지난달 대비
  data: { totalGb: 30, leftGb: 8.4, usedPercent: 72, daysLeft: 12 },
  call: { minutes: 214, unlimited: true },
}
