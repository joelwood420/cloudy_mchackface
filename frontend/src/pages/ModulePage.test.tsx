import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { jsonResponse, renderAt } from '../test/utils'
import { formatDueDate } from './ModulePage'

const detail = {
  key: 'ccc602',
  code: 'CCC602',
  title: 'Data Engineering in the Public Cloud',
  weeks: [
    {
      key: 'ccc602-w09',
      week_number: 9,
      title: 'DP-900 Learning Paths 1–4',
      tasks: [
        { key: 't1', title: 'DP-900 LP1', type: 'learning_path', external_url: 'https://learn.test/lp1', uplearn_url: null },
        { key: 't2', title: 'Read the A3 brief', type: 'assessment_step', external_url: null, uplearn_url: 'https://up.test/a3' },
      ],
    },
    { key: 'ccc602-w10', week_number: 10, title: 'Quiet week', tasks: [] },
  ],
  assessments: [
    { key: 'a3', title: 'Assessment 3', due_date: '2026-10-25', uplearn_url: 'https://up.test/a3' },
    { key: 'a4', title: 'Assessment 4', due_date: null, uplearn_url: null },
  ],
}

describe('ModulePage', () => {
  it('shows weeks with their tasks and links', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(detail)))
    renderAt('/modules/ccc602')

    expect(await screen.findByRole('heading', { name: /Data Engineering in the Public Cloud/ })).toBeInTheDocument()
    const week9 = screen.getByText('Week 9: DP-900 Learning Paths 1–4').closest('details')!
    expect(within(week9).getByText('2 tasks')).toBeInTheDocument()

    const lp1 = within(week9).getByText('DP-900 LP1').closest('li')!
    const open = within(lp1).getByRole('link', { name: 'Open' })
    expect(open).toHaveAttribute('href', 'https://learn.test/lp1')
    expect(open).toHaveAttribute('target', '_blank')
    expect(open).toHaveAttribute('rel', 'noopener noreferrer')

    const brief = within(week9).getByText('Read the A3 brief').closest('li')!
    expect(within(brief).queryByRole('link', { name: 'Open' })).toBeNull()
    expect(within(brief).getByRole('link', { name: 'UPLearn' })).toHaveAttribute('href', 'https://up.test/a3')
  })

  it('uses singular "task" for a week with one task', async () => {
    const single = {
      ...detail,
      weeks: [{ key: 'w1', week_number: 1, title: 'Intro', tasks: [detail.weeks[0].tasks[0]] }],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(single)))
    renderAt('/modules/ccc602')
    const week1 = (await screen.findByText('Week 1: Intro')).closest('details')!
    expect(within(week1).getByText('1 task')).toBeInTheDocument()
  })

  it('handles a week with no tasks', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(detail)))
    renderAt('/modules/ccc602')
    const week10 = (await screen.findByText('Week 10: Quiet week')).closest('details')!
    expect(within(week10).getByText('No tasks listed for this week.')).toBeInTheDocument()
  })

  it('lists assessments with due dates', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(detail)))
    renderAt('/modules/ccc602')
    const a3 = (await screen.findByText('Assessment 3')).closest('li')!
    expect(a3).toHaveTextContent(/25 Oct 2026/)
    const a4 = screen.getByText('Assessment 4').closest('li')!
    expect(a4).toHaveTextContent('Due date: see programme guide')
  })

  it('shows "Module not found" for an unknown key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ detail: 'Module not found' }, 404)))
    renderAt('/modules/nope')
    expect(await screen.findByRole('heading', { name: 'Module not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to modules' })).toHaveAttribute('href', '/')
  })

  it('formats dates without shifting the day', () => {
    expect(formatDueDate('2026-10-25')).toMatch(/25 Oct 2026/)
    expect(formatDueDate('2026-01-01')).toMatch(/1 Jan 2026/)
  })
})
