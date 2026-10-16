import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ApiError, isUnauthorized } from './api'
import { AppShell } from './components/AppShell'
import { RequireAuth } from './components/RequireAuth'
import { AssessmentsPage } from './pages/AssessmentsPage'
import { AuthPage } from './pages/AuthPage'
import { DisclaimerGate } from './components/DisclaimerGate'
import { DisclaimerPage } from './pages/DisclaimerPage'
import { ModulePage } from './pages/ModulePage'
import { ModulesPage } from './pages/ModulesPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ThisWeekPage } from './pages/ThisWeekPage'

/** Never retry client errors (4xx); retry everything else (5xx, network) once. */
export function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
  return failureCount < 1
}

/** A 401 anywhere means the session ended: re-check who is signed in, which sends them to /login. */
export function makeQueryClient(retry: typeof shouldRetry | false = shouldRetry): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (isUnauthorized(error) && query.queryKey[0] !== 'me') void client.invalidateQueries({ queryKey: ['me'] })
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (isUnauthorized(error)) void client.invalidateQueries({ queryKey: ['me'] })
      },
    }),
    defaultOptions: { queries: { retry } },
  })
  return client
}

const queryClient = makeQueryClient()

export function AppRoutes() {
  return (
    <DisclaimerGate>
      <Routes>
        <Route path="/login" element={<AuthPage key="login" mode="login" />} />
        <Route path="/signup" element={<AuthPage key="signup" mode="signup" />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<ThisWeekPage />} />
            <Route path="/modules" element={<ModulesPage />} />
            <Route path="/modules/:key" element={<ModulePage />} />
            <Route path="/assessments" element={<AssessmentsPage />} />
            <Route path="/disclaimer" element={<DisclaimerPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </DisclaimerGate>
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
