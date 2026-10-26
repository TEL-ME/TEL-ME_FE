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

/** 요금제 고르기 화면 */
const PLAN_SELECT = '/my/plan/select'

/** 링크 문구면 이동할 경로, 아니면 undefined (요금제 이름이 붙은 문구는 parsePlanTaskLink로 읽는다) */
export function planTaskPath(label: string): string | undefined {
  return PLAN_TASK_LINKS[label.trim()]
}

/** 요금제 이름이 붙은 링크 문구 (백엔드 PlanTaskLinks.subscribeTo·changeTo): "5G 스탠다드 가입하러 가기" */
const NAMED_LINK = /^(.+?) (가입|변경)하러 가기$/

export interface PlanTaskLink {
  path: string
  /** 대상 요금제 이름. 하나로 정해졌을 때만 있다 */
  planName?: string
}

/**
 * 링크 문구를 읽는다. 기본 문구 4개와, 대상 요금제가 하나로 정해졌을 때 이름이 붙는
 * "{요금제 이름} 가입하러 가기"·"{요금제 이름} 변경하러 가기"를 링크로 본다. 아니면 undefined
 */
export function parsePlanTaskLink(label: string): PlanTaskLink | undefined {
  const text = label.trim()
  const path = planTaskPath(text)
  if (path) return { path }
  const named = NAMED_LINK.exec(text)
  // "요금제 가입하러 가기"는 위에서 이미 잡힌다. 이름 자리에 "요금제"만 있는 문구는 이름으로 보지 않는다
  if (!named || named[1].trim() === '요금제') return undefined
  return { path: PLAN_SELECT, planName: named[1].trim() }
}

const compactName = (name: string) => name.replace(/\s+/g, '').toLowerCase()

/** 링크가 갈 주소. 이름이 있으면 요금제 목록에서 찾아 ?planId=를 붙이고, 못 찾으면 고르기 화면만 연다 */
export function planTaskHref(link: PlanTaskLink, plans: readonly { planId: number; name: string }[]): string {
  if (!link.planName) return link.path
  const target = compactName(link.planName)
  const found = plans.find((p) => compactName(p.name) === target)
  return found ? `${link.path}?planId=${found.planId}` : link.path
}
