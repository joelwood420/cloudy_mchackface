import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { jsonResponse, mockApi, renderAt } from '../test/utils'

const all = [
  { key: 'a1', title: 'Assessment 1', due_date: '2026-08-16', uplearn_url: null, submitted: true, status: 'submitted', days_until: -62, module_key: 'ccc601', module_code: 'CCC601' },
  { key: 'a3', title: 'Assessment 3', due_date: '2026-10-25', uplearn_url: 'https://up.test/a3', submitted: false, status: 'upcoming', days_until: 8, module_key: 'ccc602', module_code: 'CCC602' },
]

describe('AssessmentsPage', () => {
  it('groups assessments by module', async () => {
    mockApi({ '/api/assessments': all, '/api/modules': [] })
    renderAt('/assessments')
    expect(await screen.findByRole('heading', { level: 1, name: 'Assessments' })).toBeInTheDocument()
    const ccc602 = screen.getByRole('region', { name: 'CCC602' })
    expect(within(ccc602).getByText('Assessment 3')).toBeInTheDocument()
    expect(within(ccc602).getByText('Due in 8 days')).toBeInTheDocument()
  })

  it('ticks submitted straight away and saves it', async () => {
    const calls: string[] = []
    // The server remembers the tick, so the refetch after saving agrees with the screen.
    mockApi({
      '/api/assessments': () => jsonResponse(calls.length ? all.map((a) => (a.key === 'a3' ? { ...a, submitted: true, status: 'submitted' } : a)) : all),
      '/api/modules': [],
      'PUT /api/assessments/a3/submitted': () => (calls.push('put'), new Response(null, { status: 204 })),
    })
    renderAt('/assessments')
    const region = await screen.findByRole('region', { name: 'CCC602' })
    await userEvent.click(within(region).getByRole('checkbox', { name: 'Mark submitted' }))
    expect(within(region).getByRole('checkbox', { name: 'Mark submitted' })).toBeChecked()
    await waitFor(() => expect(calls).toEqual(['put']))
  })

  it('rolls the tick back when saving fails', async () => {
    mockApi({ '/api/assessments': all, '/api/modules': [], 'PUT /api/assessments/a3/submitted': () => jsonResponse({ detail: 'boom' }, 500) })
    renderAt('/assessments')
    const region = await screen.findByRole('region', { name: 'CCC602' })
    await userEvent.click(within(region).getByRole('checkbox', { name: 'Mark submitted' }))
    await waitFor(() => expect(within(region).getByRole('checkbox', { name: 'Mark submitted' })).not.toBeChecked())
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save that tick. Try again.")
  })
})
