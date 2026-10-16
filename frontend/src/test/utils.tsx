import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { Me, ThisWeek } from '../api'
import { AppRoutes, makeQueryClient } from '../App'

export const ME: Me = { email: 'joel@example.com', study_mode: 'FT', intake: { key: '2607-online-ccc-ft', title: 'July 2026 intake, full-time (NZ4129)' } }

export const THIS_WEEK: ThisWeek = {
  today: '2026-10-14',
  status: 'teaching',
  week: { week_number: 11, starts_on: '2026-10-12', ends_on: '2026-10-18' },
  current_break: null,
  next_week: null,
  upcoming_break: null,
  holidays: [],
  groups: [],
  ahead: null,
  lurking: [],
  assessments: [],
  stats: { done: 0, total: 0, next_deadline_days: null },
}

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
 * functions get the request init and build their own Response (or throw). `/api/me` answers ME and `/api/this-week` answers
 * THIS_WEEK unless overridden. Anything else is a 404.
 */
export function mockApi(routes: Record<string, Route>) {
  const all: Record<string, Route> = { '/api/me': ME, '/api/this-week': THIS_WEEK, ...routes }
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
