/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // 백엔드에 CORS 설정이 없어서, 개발 중에는 같은 출처(localhost:3000)로 요청하고 Vite가 백엔드로 넘긴다.
  // 같은 출처라 세션 쿠키(JSESSIONID)도 그대로 오간다.
  const target = env.VITE_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [react()],
    server: {
      // 카카오 로그인 후 백엔드가 FRONTEND_URL(기본 http://localhost:3000)로 돌려보낸다
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': { target, changeOrigin: true },
        '/oauth2': { target, changeOrigin: true },
        '/login/oauth2': { target, changeOrigin: true },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
