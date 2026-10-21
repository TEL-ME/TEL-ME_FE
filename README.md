# TEL-ME_FE

RAG 기반 AI 통신 상담 및 위치 기반 매장 안내 서비스 — 프론트엔드

## 기술 스택

React 19 · TypeScript · Vite · Tailwind CSS · React Router · TanStack Query · Zustand · MSW

## 실행

npm install
npm run dev

http://localhost:3000 에서 열립니다.

- 백엔드 API 서버가 http://localhost:8080에서 떠 있어야 합니다. `/api` 요청은 개발 서버가 백엔드로 넘깁니다(프록시).
- 처음 한 번 `cp .env.example .env.local`로 환경변수 파일을 만듭니다.
- 백엔드에 아직 없는 API는 개발 모드에서 MSW가 가짜로 응답합니다(`src/mocks/handlers.ts`).
- 매장 지도는 카카오 지도를 씁니다. `.env.local`의 `VITE_KAKAO_MAP_KEY`에 카카오 JavaScript 키를 넣고, 카카오 개발자 콘솔에서 그 키(앱 > 플랫폼 키 > JavaScript 키)의 JavaScript SDK 도메인에 `http://localhost:3000`을 등록하고, 카카오맵 > 사용 설정을 ON으로 둡니다. 키가 없으면 간이 지도로 보입니다.

## 베타 테스트 화면 기록

- 클래리티는 기본으로 꺼져 있습니다. 사용할 환경에서 `VITE_CLARITY_ENABLED=true`와
  `VITE_CLARITY_PROJECT_ID`를 함께 지정합니다. `VITE_CLARITY_ENVIRONMENT`는 `local` 또는 `beta`입니다.
- 위 값은 프론트 빌드에 포함됩니다. 배포 서버에 실행 환경 변수만 추가하는 것으로는 적용되지 않으며,
  배포 빌드 단계에 전달하고 다시 빌드해야 합니다.
- 화면 전체를 기본으로 가리고, 대화 목록·새 대화·상담 종료·종료 확인·취소와
  하단 고정 메뉴만 예외로 둡니다.
  상담 제목·입력·답변·회원 정보를 포함한 상위 영역의 가림을 풀지 않습니다.
- 별도 클릭 이벤트는 정해진 동작 이름만 보냅니다. 상담 본문·회원 식별자·입력값은 추가하지 않습니다.
- 확인 순서: 실제 서비스에서 채팅 → 상담 종료 → 취소 또는 종료 확인 → 대화 목록·화면 이동 진행 후,
  클래리티 레코딩에서 본문 가림과 버튼 식별·클릭 기록을 대조합니다. 히트맵 집계는 따로 확인합니다.
