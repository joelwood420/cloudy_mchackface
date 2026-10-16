import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes, makeQueryClient } from '../App'

export const ME = { email: 'joel@example.com', current_week: null, study_mode: 'FT' }

export function renderAt(path: string) {
  const client = makeQueryClient(false)
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

type Handler = (init?: RequestInit) => Response | Promise<Response>
type Route = unknown | Handler

/**
 * Stub fetch. Keys are "METHOD /api/path" or a bare "/api/path" (GET only). Plain values become 200 JSON;
 * functions get the request init and build their own Response (or throw). `/api/me` answers ME unless
 * overridden. Anything else is a 404.
 */
export function mockApi(routes: Record<string, Route>) {
  const all: Record<string, Route> = { '/api/me': ME, ...routes }
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    const method = (init?.method ?? 'GET').toUpperCase()
    const key = `${method} ${url}` in all ? `${method} ${url}` : method === 'GET' && url in all ? url : null
    if (key === null) return jsonResponse({ detail: 'Not found' }, 404)
    const route = all[key]
    return typeof route === 'function' ? (route as Handler)(init) : jsonResponse(route)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
