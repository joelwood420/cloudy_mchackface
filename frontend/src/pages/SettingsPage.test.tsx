import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ME, jsonResponse, mockApi, renderAt } from '../test/utils'

const modules = [
  { key: 'ccc601', code: 'CCC601', title: 'Admin', week_count: 2, task_count: 2, completed_count: 0, week_numbers: [1, 2], uplearn_url: null },
  { key: 'ccc602', code: 'CCC602', title: 'Data', week_count: 1, task_count: 1, completed_count: 0, week_numbers: [9], uplearn_url: null },
]

describe('SettingsPage', () => {
  it('picks a current week and saves it', async () => {
    const fetchMock = mockApi({
      '/api/modules': modules,
      'PATCH /api/me/settings': (init?: RequestInit) => {
        expect(JSON.parse(String(init?.body))).toEqual({ current_week: 9 })
        return jsonResponse({ ...ME, current_week: 9 })
      },
    })
    renderAt('/settings')
    const select = await screen.findByLabelText('Current week')
    expect(select).toHaveValue('')
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Not set', 'Week 1 · CCC601', 'Week 2 · CCC601', 'Week 9 · CCC602',
    ])
    await userEvent.selectOptions(select, 'Week 9 · CCC602')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Saved.')).toHaveAttribute('role', 'status')
    expect(fetchMock).toHaveBeenCalledWith('/api/me/settings', expect.objectContaining({ method: 'PATCH' }))
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getByText('Week 9')).toBeInTheDocument()
    expect(document.title).toBe('Settings · Cloudy McHackface')
  })

  it('starts from the saved week and can clear it', async () => {
    mockApi({
      '/api/me': { ...ME, current_week: 2 },
      '/api/modules': modules,
      'PATCH /api/me/settings': (init?: RequestInit) => {
        expect(JSON.parse(String(init?.body))).toEqual({ current_week: null })
        return jsonResponse(ME)
      },
    })
    renderAt('/settings')
    const select = await screen.findByLabelText('Current week')
    expect(select).toHaveValue('2')
    await userEvent.selectOptions(select, 'Not set')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Saved.')).toHaveAttribute('role', 'status')
  })

  it('shows the error when saving fails', async () => {
    mockApi({
      '/api/modules': modules,
      'PATCH /api/me/settings': () => jsonResponse({ detail: 'No such week' }, 422),
    })
    renderAt('/settings')
    await userEvent.selectOptions(await screen.findByLabelText('Current week'), 'Week 1 · CCC601')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No such week')
  })
})
