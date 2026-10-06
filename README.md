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
- 매장 지도는 카카오 지도를 씁니다. `.env.local`의 `VITE_KAKAO_MAP_KEY`에 카카오 JavaScript 키를 넣고, 카카오 개발자 콘솔의 플랫폼 > Web에 `http://localhost:3000`을 등록합니다. 키가 없으면 간이 지도로 보입니다.
