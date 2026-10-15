import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ModulePage } from './pages/ModulePage'
import { ModulesPage } from './pages/ModulesPage'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ModulesPage />} />
      <Route path="/modules/:key" element={<ModulePage />} />
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
