import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { jsonResponse, renderAt } from '../test/utils'

const modules = [
  { key: 'ccc601', code: 'CCC601', title: 'Public Cloud Administration', week_count: 0, task_count: 0 },
  { key: 'ccc602', code: 'CCC602', title: 'Data Engineering in the Public Cloud', week_count: 8, task_count: 30 },
]

describe('ModulesPage', () => {
  it('lists modules with links and counts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(modules)))
    renderAt('/')
    const link = await screen.findByRole('link', { name: /Data Engineering in the Public Cloud/ })
    expect(link).toHaveAttribute('href', '/modules/ccc602')
    expect(screen.getByText('8 weeks · 30 tasks')).toBeInTheDocument()
  })

  it('shows a hint when there are no modules', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([])))
    renderAt('/')
    expect(await screen.findByText(/No modules yet/)).toBeInTheDocument()
  })

  it('shows an error and retries', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ detail: 'Server exploded' }, 500))
      .mockResolvedValueOnce(jsonResponse(modules))
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/')

    expect(await screen.findByRole('alert')).toHaveTextContent('Server exploded')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('link', { name: /Public Cloud Administration/ })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shows an error when the backend is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    renderAt('/')
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to fetch')
  })
})
