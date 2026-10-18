import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { jsonResponse, mockApi, renderAt } from '../test/utils'

const all = [
  { key: 'a1', title: 'Assessment 1', due_date: '2026-08-16', uplearn_url: null, submitted: true, status: 'submitted', days_until: -62, module_key: 'ccc601', module_code: 'CCC601' },
  { key: 'a4', title: 'Assessment 4', due_date: '2026-11-22', uplearn_url: null, submitted: false, status: 'upcoming', days_until: 36, module_key: 'ccc602', module_code: 'CCC602' },
  { key: 'a3', title: 'Assessment 3', due_date: '2026-10-25', uplearn_url: 'https://up.test/a3', submitted: false, status: 'upcoming', days_until: 8, module_key: 'ccc602', module_code: 'CCC602' },
  { key: 'a5', title: 'Assessment 5', due_date: null, uplearn_url: null, submitted: false, status: 'no_date', days_until: null, module_key: 'ccc603', module_code: 'CCC603' },
]

const row = (title: string) => screen.getByRole('heading', { name: title }).closest('li')!

describe('AssessmentsPage', () => {
  it('leads with the next deadline, then the rest soonest first', async () => {
    mockApi({ '/api/assessments': all, '/api/modules': [] })
    renderAt('/assessments')
    expect(await screen.findByRole('heading', { level: 1, name: 'Assessments' })).toBeInTheDocument()
    const next = screen.getByRole('region', { name: 'Next due' })
    expect(within(next).getByText('Assessment 3')).toBeInTheDocument()
    expect(within(next).getByText('CCC602')).toBeInTheDocument()
    expect(within(next).getByText('Due in 8 days')).toBeInTheDocument()
    const after = screen.getByRole('region', { name: 'After that' })
    expect(within(after).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Assessment 4', 'Assessment 5'])
    expect(row('Assessment 5')).toHaveTextContent('Due date: see programme guide')
  })

  it('keeps submitted ones folded away until asked', async () => {
    mockApi({ '/api/assessments': all, '/api/modules': [] })
    renderAt('/assessments')
    const submitted = await screen.findByRole('region', { name: 'Submitted (1)' })
    expect(within(submitted).queryByText('Assessment 1')).toBeNull()
    await userEvent.click(within(submitted).getByRole('button', { name: 'Show' }))
    expect(within(submitted).getByRole('checkbox', { name: 'Mark submitted' })).toBeChecked()
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
    await screen.findByRole('region', { name: 'Next due' })
    await userEvent.click(within(row('Assessment 3')).getByRole('checkbox', { name: 'Mark submitted' }))
    expect(screen.getByRole('region', { name: 'Submitted (2)' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Next due' })).getByText('Assessment 4')).toBeInTheDocument()
    await waitFor(() => expect(calls).toEqual(['put']))
  })

  it('rolls the tick back when saving fails', async () => {
    mockApi({ '/api/assessments': all, '/api/modules': [], 'PUT /api/assessments/a3/submitted': () => jsonResponse({ detail: 'boom' }, 500) })
    renderAt('/assessments')
    await screen.findByRole('region', { name: 'Next due' })
    await userEvent.click(within(row('Assessment 3')).getByRole('checkbox', { name: 'Mark submitted' }))
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Next due' })).getByText('Assessment 3')).toBeInTheDocument())
    expect(within(row('Assessment 3')).getByRole('checkbox', { name: 'Mark submitted' })).not.toBeChecked()
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save that tick. Try again.")
  })

  it('says so when everything is submitted', async () => {
    mockApi({ '/api/assessments': [all[0]], '/api/modules': [] })
    renderAt('/assessments')
    expect(await screen.findByText("Everything's submitted. Nice work.")).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Next due' })).toBeNull()
  })
})
