# TEL-ME_FE

RAG 기반 AI 통신 상담 및 위치 기반 매장 안내 서비스 — 프론트엔드

## 기술 스택

React 19 · TypeScript · Vite · Tailwind CSS · react-router-dom

## 실행

npm install
npm run dev

http://localhost:5173 에서 열립니다.

백엔드 API 서버가 http://localhost:8080에서 떠 있어야 합니다.

## AI 상담 테스트 화면

기존 첫 화면은 유지하고 `/chat-test`에 별도 테스트 화면을 추가했습니다.

1. `npm ci`
2. `.env.example`을 `.env.local`로 복사하고 `VITE_API_BASE_URL`을 본인 백엔드 주소로 설정
3. `npm run dev` 후 터미널에 표시된 주소의 `/chat-test` 접속
4. 기본은 **화면 데모**입니다. 실제 서버를 테스트하려면 상단 **API 연결**을 선택하세요.

환경변수를 바꾼 뒤에는 프론트 개발 서버를 재시작하세요. 개발 프록시가 `/api`를 백엔드로 전달하며 쿠키를 포함합니다. API 모드는 상담 데이터를 실제 저장하므로 개발용 서버에서 사용하세요.

### 실제 API 연결 범위

| 방법 | 경로 | 목적 |
| --- | --- | --- |
| POST | `/api/v1/chat/sessions` | `{}`로 세션 생성 |
| POST | `/api/v1/chat/sessions/{id}/messages` | `{"content":"질문"}` 전송 |
| GET | `/api/v1/chat/sessions/{id}/messages?size=50` | 답변·되묻기 이력 조회 |

동일 세션에서 질문 → 되묻기 → 후속 답변을 확인합니다. 실제 결과는 백엔드 구현과 DB·모델 실행 상태에 따릅니다. 메시지 응답의 `runningExecutionId`가 있으면 1초 간격으로 최대 3분 조회하며 SSE 방식은 아닙니다. 전송 결과가 불명확하면 자동 재전송하지 않고 이력을 먼저 확인하세요. 프론트 조회 시간 초과는 서버 작업 취소를 의미하지 않습니다.

### 데모 및 미연결 항목

데모 응답·매장·피드백은 예시이며 서버에 저장하지 않습니다. 실제 SSE, 답변 근거 조회, 피드백 API, 서버 상담 목록·이력 페이지네이션·새로고침 복원, 지도는 미연결입니다. 데모 사유 문구는 서버 reasonCode 계약이 아닙니다.

회원 로그인 화면은 없으며 서버의 로그인/게스트 발급 설정에 따라 인증됩니다. 화면 프로필은 인증 성공을 보장하지 않습니다.

API 수정 위치: `src/chat-test/api/chat.ts`.
검사: `npm run check:chat` (전체 lint → 응답 처리 테스트 5개 → 전체 빌드).

배포·preview에는 개발 프록시가 적용되지 않으므로 별도의 API 라우팅 설정이 필요합니다. 본 브랜치는 로컬 백엔드 연결 확인용 초안이며 실제 AI E2E 성공을 보장하는 완료본이 아닙니다.
