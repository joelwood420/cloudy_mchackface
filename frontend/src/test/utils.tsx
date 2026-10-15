import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from '../App'

export function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

type Route = unknown | (() => Response | Promise<Response>)

/** Stub fetch, answering by URL. Plain values become 200 JSON; functions build their own Response (or throw). Unknown URLs get 404. */
export function mockApi(routes: Record<string, Route>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (!(url in routes)) return jsonResponse({ detail: 'Not found' }, 404)
    const route = routes[url]
    return typeof route === 'function' ? (route as () => Response | Promise<Response>)() : jsonResponse(route)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
