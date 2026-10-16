import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ThisWeek } from '../api'
import { THIS_WEEK, jsonResponse, mockApi, renderAt } from '../test/utils'

const task = (key: string, done = false) => ({ key, title: `Task ${key}`, type: 'lab' as const, external_url: 'https://x.test/' + key, uplearn_url: null, note: null, done })
const group = (weekNumber: number, tasks: ReturnType<typeof task>[]) => ({
  module_key: 'ccc602', module_code: 'CCC602', module_title: 'Data Engineering in the Public Cloud', module_uplearn_url: 'https://up.test/602',
  submodule: { key: 'dp900', code: 'DP-900', title: 'Azure Data Fundamentals', uplearn_url: null },
  week: { key: `w${weekNumber}`, submodule_key: 'dp900', week_number: weekNumber, title: `Week ${weekNumber} work`, tasks },
  prerequisites: [{ key: 'azure', title: 'Create an Azure account', note: null, external_url: 'https://azure.test', uplearn_url: null, completed: false }],
})
const teaching: ThisWeek = { ...THIS_WEEK, groups: [group(11, [task('t1', true), task('t2')])], stats: { done: 1, total: 2, next_deadline_days: 8 } }

function show(tw: ThisWeek, extra: Record<string, unknown> = {}) {
  const fetchMock = mockApi({ '/api/this-week': tw, '/api/modules': [], ...extra })
  renderAt('/')
  return fetchMock
}

describe('ThisWeekPage', () => {
  it("shows this week's header, progress and tasks", async () => {
    show(teaching)
    expect(await screen.findByRole('heading', { level: 1, name: 'Week 11' })).toBeInTheDocument()
    expect(screen.getByText('Mon 12 Oct – Sun 18 Oct · CCC602 Data Engineering in the Public Cloud')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: "This week's progress" })).toHaveAttribute('aria-valuenow', '50')
    expect(screen.getByText('1/2 tasks done')).toBeInTheDocument()
    expect(screen.getByText('Next deadline in 8 days')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Task t1' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Task t2' })).not.toBeChecked()
    expect(screen.getByText('Create an Azure account')).toBeInTheDocument()
  })

  it('says when this week has no content yet', async () => {
    show({ ...THIS_WEEK })
    expect(await screen.findByText(/Content for this week isn't in the app yet\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open UPLearn' })).toHaveAttribute('href', 'https://yoobee.uplearn.education/')
  })

  it("shows next week when you're ahead", async () => {
    show({ ...teaching, ahead: { week_number: 12, groups: [group(12, [task('t12')])] } })
    expect(await screen.findByRole('heading', { name: "You're ahead of schedule 🎉" })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Next up · Week 12' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Task t12' })).toBeInTheDocument()
  })

  it("says when next week isn't in the app", async () => {
    show({ ...teaching, ahead: { week_number: 12, groups: [] } })
    expect(await screen.findByText("Week 12 isn't in the app yet.")).toBeInTheDocument()
  })

  it('shows the break screen', async () => {
    show({
      ...THIS_WEEK,
      status: 'break',
      week: null,
      current_break: { starts_on: '2026-09-14', ends_on: '2026-09-27', week_of_break: 1, length_weeks: 2 },
      next_week: { week_number: 9, starts_on: '2026-09-28' },
    })
    expect(await screen.findByRole('heading', { level: 1, name: "You're on break 🌴" })).toBeInTheDocument()
    expect(screen.getByText('Until Sun 27 Sep (week 1 of 2).')).toBeInTheDocument()
    expect(screen.getByText('Rest up, or use the time to clear anything still lurking.')).toBeInTheDocument()
    expect(screen.getByText('Week 9 starts Mon 28 Sep.')).toBeInTheDocument()
  })

  it('before the programme starts', async () => {
    show({ ...THIS_WEEK, status: 'before_start', week: null, next_week: { week_number: 1, starts_on: '2026-07-20' } })
    expect(await screen.findByRole('heading', { level: 1, name: 'This week' })).toBeInTheDocument()
    expect(screen.getByText('The programme starts Mon 20 Jul.')).toBeInTheDocument()
  })

  it('before the programme starts with no schedule', async () => {
    show({ ...THIS_WEEK, status: 'before_start', week: null, next_week: null })
    expect(await screen.findByText("The schedule isn't loaded yet.")).toBeInTheDocument()
  })

  it('after it finishes', async () => {
    show({ ...THIS_WEEK, status: 'finished', week: null })
    expect(await screen.findByRole('heading', { level: 1, name: 'Programme finished' })).toBeInTheDocument()
    expect(screen.getByText("You've reached the end of the programme.")).toBeInTheDocument()
  })

  it('ticks a task straight away and saves it', async () => {
    let saved = false
    const after: ThisWeek = { ...teaching, groups: [group(11, [task('t1', true), task('t2', true)])], stats: { done: 2, total: 2, next_deadline_days: 8 } }
    const fetchMock = show(teaching, {
      '/api/this-week': () => jsonResponse(saved ? after : teaching),
      'PUT /api/tasks/t2/complete': () => { saved = true; return new Response(null, { status: 204 }) },
    })
    const box = await screen.findByRole('checkbox', { name: 'Task t2' })
    await userEvent.click(box)
    expect(box).toBeChecked()
    expect(screen.getByText('2/2 tasks done')).toBeInTheDocument()
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([u, i]) => u === '/api/tasks/t2/complete' && (i as RequestInit | undefined)?.method === 'PUT')).toBe(true),
    )
  })

  it('refreshes this week, modules and module pages after a tick', async () => {
    const weekFetches: number[] = []
    const modulesFetches: number[] = []
    show(teaching, {
      '/api/this-week': () => { weekFetches.push(1); return jsonResponse(teaching) },
      '/api/modules': () => { modulesFetches.push(1); return jsonResponse([]) },
      'PUT /api/tasks/t2/complete': () => new Response(null, { status: 204 }),
    })
    const box = await screen.findByRole('checkbox', { name: 'Task t2' })
    const weekBefore = weekFetches.length
    const modulesBefore = modulesFetches.length
    await userEvent.click(box)
    await waitFor(() => expect(weekFetches.length).toBeGreaterThan(weekBefore))
    await waitFor(() => expect(modulesFetches.length).toBeGreaterThan(modulesBefore))
  })

  it('rolls back a failed tick', async () => {
    show(teaching, { 'PUT /api/tasks/t2/complete': () => jsonResponse({ detail: 'boom' }, 500) })
    const box = await screen.findByRole('checkbox', { name: 'Task t2' })
    await userEvent.click(box)
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save that tick. Try again.")
    await waitFor(() => expect(box).not.toBeChecked())
  })

  it('lists upcoming assessments in the rail', async () => {
    const a = { key: 'a3', title: 'Assessment 3', due_date: '2026-10-25', uplearn_url: null, submitted: false, status: 'upcoming' as const, days_until: 8, module_key: 'ccc602', module_code: 'CCC602' }
    show({ ...teaching, assessments: [a] })
    const title = await screen.findByText('Assessment 3')
    const rail = title.closest('aside') ?? title.closest('section') ?? document.body
    expect(within(rail as HTMLElement).getByText('Due in 8 days')).toBeInTheDocument()
  })

  it('shows the empty rail text', async () => {
    show(teaching)
    expect(await screen.findByText('No deadlines in the next 4 weeks.')).toBeInTheDocument()
  })
})
