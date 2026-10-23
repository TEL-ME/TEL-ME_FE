import { ChevronLeft, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { goBack } from '../features/stores/goBack'

/**
 * 개인정보처리방침 (베타 안내본).
 * 팀 초안(개인정보처리방침 반영 자료, 10/21 취합)에서 코드·담당자 확인이 끝난 내용만 옮겼다.
 * 운영 주체·문의처·시행일·항목별 보관기간·국외 이전 법인처럼 아직 정하지 않은 내용은 넣지 않는다 (확정되면 보완)
 */

interface Item {
  title: string
  rows: [string, ReactNode][]
  note?: ReactNode
}

const COLLECT: Item[] = [
  {
    title: '회원가입·로그인',
    rows: [
      ['처리 항목', '이름, 이메일, 비밀번호, 회원 식별정보'],
      ['목적', '계정 생성·인증, 본인 상담 기록 조회와 회원 기능 제공'],
    ],
    note: '이메일 회원가입에서는 휴대전화 번호를 받지 않아요. 비밀번호는 원문을 되돌릴 수 없는 방식으로 바꿔 저장해요.',
  },
  {
    title: '소셜 로그인 (카카오·구글)',
    rows: [
      ['처리 항목', '로그인 제공자와 제공자 식별정보, 제공받은 이름·닉네임·이메일'],
      ['목적', '소셜 계정 인증과 TEL-ME 계정 연결'],
    ],
    note: '실제로 받는 정보는 로그인 제공자와 이용자가 동의한 범위에 따라 달라요.',
  },
  {
    title: '비회원 상담',
    rows: [
      ['처리 항목', '비회원 식별정보(임의 번호), 생성·최근 이용 시각, 상담 연결 정보'],
      ['목적', '비회원 구분, 상담 이력 제공, 로그인한 뒤 상담 기록 연결'],
    ],
  },
  {
    title: 'AI 상담과 상담 이력',
    rows: [
      ['처리 항목', '질문·답변, 상담 제목·상태·시각, 필요한 이전 대화, 상담 조건, 검색 근거, 처리 결과와 AI 실행 기록'],
      ['목적', '상담 제공, 문맥 유지, 상담 이력 조회, 오류 분석과 품질 점검'],
    ],
    note: '상담에 직접 적은 개인정보는 상담 내용과 처리 기록에 함께 남을 수 있어요.',
  },
  {
    title: '요금제·사용량',
    rows: [
      ['처리 항목', '가입 요금제, 약정·사용량·이용 이력, 일부 요금제의 자격 확인에 필요한 생년월일'],
      ['목적', '가입 정보 조회, 요금제 추천·자격 확인'],
    ],
    note: '생년월일은 청소년·시니어 요금제처럼 자격 확인이 필요한 경우에만 받아요. 회원가입 필수 항목이 아니에요.',
  },
  {
    title: '음성 질문·답변 듣기',
    rows: [
      ['처리 항목', '녹음한 음성(최대 30초), 인식된 문장, 음성으로 바꿀 답변 문장'],
      ['목적', '음성 질문 인식, 답변 읽어 주기'],
    ],
    note: '음성에는 목소리와 말한 내용이 담겨요. 인식된 문장은 직접 확인·수정해서 보낸 경우에만 상담 기록으로 저장돼요.',
  },
  {
    title: '매장 찾기·현재 위치·길찾기',
    rows: [
      ['처리 항목', '입력하거나 고른 지역, "현재 위치 사용"으로 보낸 좌표, 길찾기 출발지·도착지'],
      ['목적', '주변 매장 검색, 거리·경로 안내'],
    ],
    note: '현재 위치는 누를 때만 받아요. 상담에서 보낸 좌표는 매장 검색에만 쓰고 대화 기록에 남기지 않아요.',
  },
  {
    title: '이용 통계·오류 확인',
    rows: [
      ['처리 항목', '방문한 화면 주소, 이용 이벤트, 기기·브라우저 정보, 쿠키·세션 식별정보, 오류 기록'],
      ['목적', '사용성 개선, 기능 이용 현황 파악, 오류 확인과 대응'],
    ],
  },
]

const SERVICES: [string, string][] = [
  ['AWS', '서비스 운영, 회원·상담 정보와 운영 기록 관리'],
  ['Amazon Bedrock', '질문 분류·판정과 답변 생성'],
  ['Amazon Transcribe', '음성 질문을 문자로 바꾸기'],
  ['Amazon Polly', '답변 읽어 주기'],
  ['Microsoft Clarity', '화면 이용 흐름과 불편한 지점 분석'],
  ['Google Analytics', '서비스 이용 통계'],
  ['Sentry', '화면·서버 오류 수집과 분석'],
  ['카카오 지도', '매장 위치를 지도에 표시'],
  ['카카오·구글 로그인', '소셜 계정 인증'],
]

const KEEP: [string, string][] = [
  ['녹음한 음성', '서버에 저장하지 않아요. 문자로 바꾼 뒤 메모리에서 사라져요'],
  ['답변 음성', '다시 듣기를 위해 서버 메모리와 브라우저에 최대 1시간'],
  ['인식된 문장', '보낸 경우에만 상담 기록으로 저장'],
  ['상담에서 보낸 현재 위치 좌표', '매장 검색에만 쓰고 저장하지 않아요'],
  ['Sentry 오류 기록', '30일 뒤 자동 삭제'],
  ['Clarity 화면 기록', '일반 기록 30일, 클릭 집계·히트맵과 표시해 둔 일부 기록은 최대 9개월'],
]

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="flex items-baseline gap-1.5 px-1 text-[17px] font-extrabold leading-6">
        <span className="text-brand-text">{n}.</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

const card = 'rounded-[18px] bg-surface px-4 py-3.5'
const body = 'text-sm leading-[22px] text-ink-sub'

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className={`${card} ${body} flex list-none flex-col gap-1.5`}>
      {items.map((t, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-ink-muted" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}

function Pairs({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="m-0 flex flex-col gap-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-0.5">
          <dt className="text-xs font-bold text-ink-muted">{k}</dt>
          <dd className="m-0 text-sm leading-[22px] text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function PrivacyPage() {
  const navigate = useNavigate()
  return (
    <main className="no-scrollbar mx-auto flex w-full max-w-[480px] flex-1 flex-col overflow-y-auto">
      <header className="sticky top-0 z-[2] flex shrink-0 items-center gap-1 bg-bg pb-1 pl-2 pr-4 pt-2">
        <button
          type="button"
          aria-label="뒤로"
          onClick={() => goBack(navigate, '/settings')}
          className="flex h-11 w-11 items-center justify-center text-ink"
        >
          <ChevronLeft size={22} strokeWidth={2} aria-hidden />
        </button>
        <h1 className="text-[17px] font-extrabold">개인정보처리방침</h1>
      </header>

      <div className="flex flex-col gap-7 px-4 pb-10 pt-2">
        <p className="m-0 flex gap-2 rounded-2xl bg-notice px-3.5 py-3 text-[13px] leading-5 text-notice-text">
          <Info size={16} strokeWidth={2} aria-hidden className="mt-0.5 shrink-0" />
          <span>
            베타 서비스 기간에 적용되는 안내예요. 문의처·시행일·항목별 보관기간 같은 내용은 정해지는 대로 이 화면에
            보완할게요.
          </span>
        </p>

        <p className={`${body} m-0 px-1`}>
          TEL-ME는 이용자의 개인정보를 소중히 다루며, 어떤 정보를 왜 처리하는지 아래와 같이 알려 드려요.
        </p>

        <Section n={1} title="처리하는 정보와 목적">
          <p className={`${body} m-0 px-1`}>이용하는 기능에 따라 다음 정보를 처리해요.</p>
          {COLLECT.map((it) => (
            <div key={it.title} className={`${card} flex flex-col gap-2.5`}>
              <h3 className="m-0 text-[15px] font-bold">{it.title}</h3>
              <Pairs rows={it.rows} />
              {it.note && <p className={`${body} m-0 border-t border-line pt-2.5 text-[13px] leading-5`}>{it.note}</p>}
            </div>
          ))}
        </Section>

        <Section n={2} title="AI 상담에서의 정보 처리">
          <Bullets
            items={[
              '상담을 위해 현재 질문, 필요한 이전 대화 일부, 상담 조건과 참고 자료를 AI 서비스(Amazon Bedrock)에 보내요. 처리 단계에 따라 보내는 범위가 달라요.',
              '주민등록번호·카드번호 형식은 저장하거나 보내기 전에 가려요. 이름·이메일·전화번호·주소 같은 다른 개인정보는 자동으로 지워지지 않아요.',
              '상담에 필요 없는 개인정보는 적지 말아 주세요. 직접 적은 내용은 상담 이력과 AI 처리 내용에 포함될 수 있어요.',
              '음성 질문은 문자로 바꾸기 위해 음성 인식 서비스로 보내요. 문자 입력의 가림 처리가 녹음한 음성에는 적용되지 않아요.',
            ]}
          />
        </Section>

        <Section n={3} title="이용하는 외부 서비스">
          <div className={`${card} flex flex-col divide-y divide-line py-1`}>
            {SERVICES.map(([name, use]) => (
              <div key={name} className="flex flex-col gap-0.5 py-2.5">
                <span className="text-sm font-bold">{name}</span>
                <span className={`${body} text-[13px] leading-5`}>{use}</span>
              </div>
            ))}
          </div>
          <p className={`${body} m-0 px-1 text-[13px] leading-5`}>
            서비스에 따라 정보가 국외에서 처리·보관될 수 있어요. 오류 기록(Sentry)은 미국 리전에 저장돼요. 서비스별 처리 국가와
            이전받는 곳은 확인되는 대로 안내할게요.
          </p>
        </Section>

        <Section n={4} title="보관과 삭제">
          <div className={`${card} flex flex-col divide-y divide-line py-1`}>
            {KEEP.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5 py-2.5">
                <span className="text-sm font-bold">{k}</span>
                <span className={`${body} text-[13px] leading-5`}>{v}</span>
              </div>
            ))}
          </div>
          <p className={`${body} m-0 px-1 text-[13px] leading-5`}>
            상담 종료는 대화를 닫는 기능이에요. 상담 기록을 바로 지우지는 않아요.
          </p>
        </Section>

        <Section n={5} title="쿠키와 이용 분석">
          <Bullets
            items={[
              '로그인 유지와 비회원 구분을 위해 쿠키를 써요.',
              '이용 분석(Microsoft Clarity·Google Analytics)은 시작하기(온보딩)를 마친 뒤부터 수집하고, 시작하기·관리자 화면에서는 수집하지 않아요.',
              'Clarity 화면 기록은 화면 본문을 가린 채로 수집해요. 화면이 가려져도 방문 주소·기기·세션 정보는 처리될 수 있어요.',
              'Google Analytics로 보내는 이벤트에는 질문·답변 원문, 이름·이메일·전화번호, 위치 좌표, 회원 번호를 넣지 않아요. 화면 주소에는 상담 번호가 포함될 수 있어요.',
              '오류 기록(Sentry)은 오류가 났을 때만 보내요. 회원 정보, 질문·답변 원문, 요청 본문, 쿠키는 보내지 않아요.',
              '브라우저 설정에서 쿠키를 차단하거나 지울 수 있어요. 로그인 쿠키까지 막으면 일부 기능을 쓸 수 없고, 쿠키 차단만으로 모든 분석 수집이 멈추지는 않아요.',
            ]}
          />
        </Section>

        <Section n={6} title="안전하게 지키기 위한 조치">
          <Bullets
            items={[
              '비밀번호는 원문으로 되돌릴 수 없는 방식으로 바꿔 저장해요.',
              '개인정보에 접근하는 권한을 제한해요.',
              '주민등록번호·카드번호 형식은 가려서 처리해요.',
              '화면 분석 기록은 내용을 가려서 수집해요.',
            ]}
          />
          <p className={`${body} m-0 px-1 text-[13px] leading-5`}>
            화면 가림이나 일부 형식의 탐지가 모든 개인정보의 제거를 보장하지는 않아요.
          </p>
        </Section>

        <Section n={7} title="이용자의 권리">
          <p className={`${card} ${body} m-0`}>
            이용자는 관련 법령에 따라 개인정보의 열람·정정·삭제·처리정지와 동의 철회를 요청할 수 있어요. 요청을 받는 방법은 정해지는
            대로 이 화면에 안내할게요.
          </p>
        </Section>
      </div>
    </main>
  )
}
