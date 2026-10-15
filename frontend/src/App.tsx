import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ApiError } from './api'
import { ModulePage } from './pages/ModulePage'
import { ModulesPage } from './pages/ModulesPage'
import { NotFoundPage } from './pages/NotFoundPage'

/** Never retry client errors (4xx); retry everything else once. */
export function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status < 500) return false
  return failureCount < 1
}

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } })

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ModulesPage />} />
      <Route path="/modules/:key" element={<ModulePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
