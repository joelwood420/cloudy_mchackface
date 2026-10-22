import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Me } from '../api'
import { INTAKES, ME, jsonResponse, mockApi, renderAt } from '../test/utils'

const PART_TIME: Me = { ...ME, study_mode: 'PT', intake: INTAKES[1] }

describe('SettingsPage', () => {
  it('shows the current intake and saves a new one', async () => {
    const fetchMock = mockApi({
      '/api/intakes': INTAKES,
      '/api/modules': [],
      'PUT /api/me/settings': (init?: RequestInit) => {
        expect(JSON.parse(String(init?.body))).toEqual({ intake_key: '2607-online-ccc-pt' })
        return jsonResponse(PART_TIME)
      },
    })
    const { client } = renderAt('/settings')
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    const select = screen.getByLabelText('Your intake')
    await within(select).findByRole('option', { name: /part-time/ })
    expect(select).toHaveValue('2607-online-ccc-ft')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    const thisWeekCalls = () => fetchMock.mock.calls.filter(([url]) => url === '/api/this-week').length
    const before = thisWeekCalls()
    await userEvent.selectOptions(select, '2607-online-ccc-pt')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('status')).toHaveTextContent("Saved. You're now on July 2026 intake, part-time (NZ4129).")
    expect(client.getQueryData(['me'])).toEqual(PART_TIME)
    await waitFor(() => expect(thisWeekCalls()).toBeGreaterThan(before))
  })

  it('shows the server message when saving fails', async () => {
    mockApi({
      '/api/intakes': INTAKES,
      '/api/modules': [],
      'PUT /api/me/settings': () => jsonResponse({ detail: 'Pick your intake from the list.' }, 422),
    })
    renderAt('/settings')
    const select = await screen.findByLabelText('Your intake')
    await within(select).findByRole('option', { name: /part-time/ })
    await userEvent.selectOptions(select, '2607-online-ccc-pt')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Pick your intake from the list.')
  })

  it('is marked as the current page in the sidebar', async () => {
    mockApi({ '/api/intakes': INTAKES, '/api/modules': [] })
    renderAt('/settings')
    const nav = await screen.findByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page')
  })
})
