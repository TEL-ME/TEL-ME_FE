import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // 4xx는 다시 시도해도 결과가 같으니 바로 실패 처리
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
    },
  },
})
