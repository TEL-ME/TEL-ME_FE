/**
 * 요금제 업무 링크 (백엔드 PlanTaskLinks). 채팅에서 요금제 변경·가입·정지·해지를 요청하면
 * 백엔드는 처리하지 않고 followUps에 아래 문구를 담아 보낸다. 이 문구는 채팅으로 보내지 않고 해당 화면으로 이동한다.
 * 문구가 바뀌면 백엔드와 함께 바꾼다.
 */
export const PLAN_TASK_LINKS: Readonly<Record<string, string>> = {
  '요금제 가입하러 가기': '/my/plan/select',
  '요금제 변경하러 가기': '/my/plan/select',
  '일시 정지하러 가기': '/my/plan',
  '해지하러 가기': '/my/plan',
}

/** 링크 문구면 이동할 경로, 아니면 undefined */
export function planTaskPath(label: string): string | undefined {
  return PLAN_TASK_LINKS[label.trim()]
}
