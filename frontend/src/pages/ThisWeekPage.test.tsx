import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ThisWeek, ThisWeekGroup } from '../api'
import { ME, THIS_WEEK, jsonResponse, mockApi, renderAt } from '../test/utils'

const task = (key: string, done = false) => ({ key, title: `Task ${key}`, type: 'lab' as const, external_url: 'https://x.test/' + key, uplearn_url: null as string | null, note: null, done })
const group = (weekNumber: number, tasks: ReturnType<typeof task>[], post: string | null = null) => ({
  module_key: 'ccc602', module_code: 'CCC602', module_title: 'Data Engineering in the Public Cloud', module_uplearn_url: 'https://up.test/602',
  submodule: { key: 'dp900', code: 'DP-900', title: 'Azure Data Fundamentals', uplearn_url: null },
  week: { key: `w${weekNumber}`, submodule_key: 'dp900', week_number: weekNumber, title: `Week ${weekNumber} work`, tasks, schedule_post_url: post },
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
    expect(screen.getByRole('link', { name: 'Open UPLearn (opens in new tab)' })).toHaveAttribute('href', 'https://yoobee.uplearn.education/')
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
    const a = { key: 'a3', title: 'Assessment 3', due_date: '2026-10-25', uplearn_url: null, submitted: false, status: 'upcoming' as const, days_until: 8, module_key: 'ccc602', module_code: 'CCC602', submodule_code: 'DP-900', submodule_uplearn_url: null, schedule_post_url: null }
    show({ ...teaching, assessments: [a] })
    const title = await screen.findByText('Assessment 3')
    const rail = title.closest('aside') ?? title.closest('section') ?? document.body
    expect(within(rail as HTMLElement).getByText('Due in 8 days')).toBeInTheDocument()
  })

  it('keeps prerequisite checkboxes separate when a submodule shows this week and next', async () => {
    let saved = false
    const tick = (g: ThisWeekGroup) => ({ ...g, prerequisites: g.prerequisites.map((p) => ({ ...p, completed: saved })) })
    const build = (): ThisWeek => ({ ...teaching, groups: teaching.groups.map(tick), ahead: { week_number: 12, groups: [tick(group(12, [task('t12')]))] } })
    const fetchMock = show(build(), {
      '/api/this-week': () => jsonResponse(build()),
      'PUT /api/prerequisites/azure/complete': () => { saved = true; return new Response(null, { status: 204 }) },
    })
    const boxes = await screen.findAllByRole('checkbox', { name: 'Create an Azure account' })
    expect(boxes).toHaveLength(2)
    expect(boxes[0].id).not.toBe(boxes[1].id)
    await userEvent.click(screen.getAllByText('Create an Azure account')[1])
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([u, i]) => u === '/api/prerequisites/azure/complete' && (i as RequestInit | undefined)?.method === 'PUT')).toBe(true),
    )
    // A ticked prerequisite moves out of the to-do list in every group that shows it.
    expect(await screen.findAllByText("You're ready to start learning.")).toHaveLength(2)
  })

  it('shows the empty rail text', async () => {
    show(teaching)
    expect(await screen.findByText('No deadlines in the next 4 weeks.')).toBeInTheDocument()
  })

  it('warns about lurking tasks and opens them on Quarantine', async () => {
    show({ ...teaching, lurking: [
      { week_number: 9, tasks: [{ ...task('old1'), module_code: 'CCC602', submodule_code: 'DP-900', submodule_uplearn_url: null, schedule_post_url: null }] },
      { week_number: 10, tasks: [{ ...task('old2'), module_code: 'CCC602', submodule_code: 'DP-900', submodule_uplearn_url: null, schedule_post_url: null }] },
    ] })
    const banner = (await screen.findByText('MALWARE DETECTED')).closest('[role="status"]') as HTMLElement
    expect(within(banner).getByText('2 unfinished tasks are lurking in Week 9, 10.')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Task old1' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Quarantine them' }))
    expect(screen.getByRole('button', { name: 'Back to this week' })).toHaveAttribute('aria-expanded', 'true')
    expect(banner.closest('.malware-banner')).toContainElement(screen.getByRole('region', { name: 'Unfinished tasks from earlier weeks' }))
    expect(screen.getByRole('heading', { name: 'Week 9' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Task old1' })).toBeInTheDocument()
  })

  it('stamps the week complete when its last task is ticked', async () => {
    let saved = false
    const done = { ...teaching, groups: [group(11, [task('t1', true), task('t2', true)])] }
    show(teaching, {
      '/api/this-week': () => jsonResponse(saved ? done : teaching),
      'PUT /api/tasks/t2/complete': () => { saved = true; return new Response(null, { status: 204 }) },
    })
    await screen.findByRole('checkbox', { name: 'Task t2' })
    expect(screen.queryByText('Week complete')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Task t2' }))
    expect(await screen.findByText('Week complete')).toHaveClass('stamp', 'is-slam')
    expect(screen.getByText('Week 11 complete.')).toBeInTheDocument()
  })

  it('shows a complete week stamped on load, without the slam', async () => {
    show({ ...teaching, groups: [group(11, [task('t1', true), task('t2', true)])] })
    const stamp = await screen.findByText('Week complete')
    expect(stamp).not.toHaveClass('is-slam')
    expect(screen.queryByText('Week 11 complete.')).not.toBeInTheDocument()
  })

  it('pops a milestone toast when a tick takes a module past a milestone', async () => {
    const mod = (completed: number) => [{ key: 'ccc602', code: 'CCC602', title: 'Data Engineering', submodule_count: 1, week_count: 1, task_count: 4, completed_count: completed, week_numbers: [11], uplearn_url: null }]
    let saved = false
    show(teaching, {
      '/api/modules': () => jsonResponse(mod(saved ? 2 : 1)),
      'PUT /api/tasks/t2/complete': () => { saved = true; return new Response(null, { status: 204 }) },
    })
    await screen.findByRole('checkbox', { name: 'Task t2' })
    await waitFor(() => expect(screen.getAllByText('CCC602').length).toBeGreaterThan(0))
    expect(screen.queryByText(/privilege escalated/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Task t2' }))
    expect(await screen.findByText('CCC602 · privilege escalated: admin')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText('CCC602 · privilege escalated: admin')).not.toBeInTheDocument()
  })

  it('stays quiet when unticking back below a milestone', async () => {
    const mod = (completed: number) => [{ key: 'ccc602', code: 'CCC602', title: 'Data Engineering', submodule_count: 1, week_count: 1, task_count: 2, completed_count: completed, week_numbers: [11], uplearn_url: null }]
    let saved = false
    const unticked = { ...teaching, groups: [group(11, [task('t1'), task('t2')])] }
    show(teaching, {
      '/api/this-week': () => jsonResponse(saved ? unticked : teaching),
      '/api/modules': () => jsonResponse(mod(saved ? 0 : 1)),
      'DELETE /api/tasks/t1/complete': () => { saved = true; return new Response(null, { status: 204 }) },
    })
    await waitFor(() => expect(screen.getAllByText('CCC602').length).toBeGreaterThan(0))
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Task t1' }))
    expect(await screen.findByRole('checkbox', { name: 'Task t1', checked: false })).toBeInTheDocument()
    expect(screen.queryByText(/CCC602 ·/)).not.toBeInTheDocument()
  })

  it('counts only unticked lurking tasks, straight after a tick', async () => {
    let saved = false
    const before = { ...teaching, lurking: [
      { week_number: 9, tasks: [{ ...task('old1'), module_code: 'CCC602', submodule_code: 'DP-900', submodule_uplearn_url: null, schedule_post_url: null }] },
      { week_number: 10, tasks: [{ ...task('old2'), module_code: 'CCC602', submodule_code: 'DP-900', submodule_uplearn_url: null, schedule_post_url: null }] },
    ] }
    const after = { ...before, lurking: [
      { week_number: 9, tasks: [{ ...task('old1', true), module_code: 'CCC602', submodule_code: 'DP-900', submodule_uplearn_url: null, schedule_post_url: null }] },
      before.lurking[1],
    ] }
    show(before, {
      '/api/this-week': () => jsonResponse(saved ? after : before),
      'PUT /api/tasks/old1/complete': () => { saved = true; return new Response(null, { status: 204 }) },
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Quarantine them' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Task old1' }))
    expect(await screen.findByText('1 unfinished task is lurking in Week 10.')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Task old1' })).toBeChecked()
  })

  it('animates a ticked lurking task out straight away', async () => {
    show({ ...teaching, lurking: [{ week_number: 9, tasks: [
      { ...task('old1'), module_code: 'CCC602', submodule_code: 'DP-900', submodule_uplearn_url: null, schedule_post_url: null },
      { ...task('old2'), module_code: 'CCC602', submodule_code: 'DP-900', submodule_uplearn_url: null, schedule_post_url: null },
    ] }] }, { 'PUT /api/tasks/old1/complete': () => new Promise<Response>(() => {}) }) // still saving, so no refetch yet
    await userEvent.click(await screen.findByRole('button', { name: 'Quarantine them' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Task old1' }))
    expect(screen.getByRole('checkbox', { name: 'Task old1' }).closest('li')).toHaveClass('is-done')
    expect(screen.getByText('1 unfinished task is lurking in Week 9.')).toBeInTheDocument()
  })

  it('shows the all-clear when the last lurking task is ticked, then fades away', async () => {
    let saved = false
    const before = { ...teaching, lurking: [{ week_number: 9, tasks: [{ ...task('old1'), module_code: 'CCC602', submodule_code: 'DP-900', submodule_uplearn_url: null, schedule_post_url: null }] }] }
    show(before, {
      '/api/this-week': () => jsonResponse(saved ? teaching : before),
      'PUT /api/tasks/old1/complete': () => { saved = true; return new Response(null, { status: 204 }) },
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Quarantine them' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Task old1' }))
    expect(await screen.findByText('SYSTEM CLEAN')).toBeInTheDocument()
    expect(screen.getByText("Threat neutralised. You're back on track.")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back to this week' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Unfinished tasks from earlier weeks' })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('SYSTEM CLEAN')).not.toBeInTheDocument(), { timeout: 5000 })
  }, 10000)

  it('can leave the quarantine list before it is cleared', async () => {
    show({ ...teaching, lurking: [{ week_number: 9, tasks: [{ ...task('old1'), module_code: 'CCC602', submodule_code: 'DP-900', submodule_uplearn_url: null, schedule_post_url: null }] }] })
    await userEvent.click(await screen.findByRole('button', { name: 'Quarantine them' }))
    expect(screen.queryByText('SYSTEM CLEAN')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Back to this week' }))
    expect(screen.queryByRole('checkbox', { name: 'Task old1' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quarantine them' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('MALWARE DETECTED')).toBeInTheDocument()
  })

  it('uses the singular for one lurking task', async () => {
    show({ ...teaching, lurking: [{ week_number: 8, tasks: [{ ...task('old'), module_code: 'CCC601', submodule_code: 'DP-900', submodule_uplearn_url: null, schedule_post_url: null }] }] })
    expect(await screen.findByText('1 unfinished task is lurking in Week 8.')).toBeInTheDocument()
  })

  it('has no banner when nothing is lurking', async () => {
    show(teaching)
    await screen.findByRole('heading', { level: 1, name: 'Week 11' })
    expect(screen.queryByText('MALWARE DETECTED')).not.toBeInTheDocument()
  })

  it('warns about a break coming up', async () => {
    show({ ...teaching, upcoming_break: { starts_on: '2026-09-14', ends_on: '2026-09-27', length_weeks: 2, resumes_week: 9, resumes_on: '2026-09-28' } })
    expect(await screen.findByText('Break coming up: 2 weeks, Mon 14 Sep – Sun 27 Sep. Week 9 starts Mon 28 Sep.')).toBeInTheDocument()
  })

  it('lists holidays this week', async () => {
    show({ ...teaching, holidays: [{ day: '2026-10-26', name: 'Labour Day' }] })
    expect(await screen.findByText('Labour Day, Mon 26 Oct: campus closed.')).toBeInTheDocument()
  })

  it('shows the lurking banner on a break too', async () => {
    show({ ...THIS_WEEK, status: 'break', week: null, current_break: { starts_on: '2026-09-14', ends_on: '2026-09-27', week_of_break: 1, length_weeks: 2 }, next_week: { week_number: 9, starts_on: '2026-09-28' }, lurking: [{ week_number: 8, tasks: [{ ...task('old'), module_code: 'CCC601', submodule_code: 'DP-900', submodule_uplearn_url: null, schedule_post_url: null }] }] })
    expect(await screen.findByText('1 unfinished task is lurking in Week 8.')).toBeInTheDocument()
  })

  it('after sign-up, says which weeks were pre-ticked and can be dismissed', async () => {
    let loggedIn = false
    mockApi({
      '/api/me': () => (loggedIn ? jsonResponse(ME) : jsonResponse({ detail: 'Not logged in' }, 401)),
      '/api/this-week': teaching,
      '/api/modules': [],
      'POST /api/auth/signup': () => {
        loggedIn = true
        return jsonResponse({ ...ME, prefilled_through_week: 10 }, 201)
      },
    })
    renderAt('/signup')
    await userEvent.type(await screen.findByLabelText('Email'), 'new@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText("We've marked weeks 1–10 as done. Untick anything you haven't finished.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText(/We've marked weeks/)).not.toBeInTheDocument()
  })
})

describe('ThisWeekPage UPLearn links', () => {
  const post = 'https://yoobee.uplearn.education/mod/forum/discuss.php?d=11'

  it("links this week's schedule post in the header and from lab rows", async () => {
    show({ ...teaching, groups: [group(11, [task('t1')], post)] })
    expect(await screen.findByRole('link', { name: 'Week 11 schedule post on UPLearn (opens in new tab)' })).toHaveAttribute('href', post)
    expect(screen.getByText(/Lab access details are in the/)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Week 11 schedule post/ }).every((a) => a.getAttribute('href') === post)).toBe(true)
  })

  it('shows no schedule post link when the week has none', async () => {
    show(teaching)
    await screen.findByRole('heading', { level: 1, name: 'Week 11' })
    expect(screen.queryByRole('link', { name: /schedule post/ })).toBeNull()
    expect(screen.queryByText(/Lab access details/)).toBeNull()
  })

  it("drops a task's UPLearn link when it only repeats the track's link, and names the rest", async () => {
    const tile = 'https://yoobee.uplearn.education/course/section.php?id=9656'
    const assign = 'https://yoobee.uplearn.education/mod/assign/view.php?id=1'
    const g = group(11, [{ ...task('t1'), uplearn_url: tile }, { ...task('t2'), uplearn_url: assign }])
    show({ ...teaching, groups: [{ ...g, submodule: { ...g.submodule, uplearn_url: tile } }] })
    expect(await screen.findByRole('link', { name: 'DP-900 tile on UPLearn (opens in new tab)' })).toHaveTextContent('DP-900 tile')
    expect(screen.queryByRole('link', { name: /Task t1 on UPLearn/ })).toBeNull()
    expect(screen.getByRole('link', { name: 'Assignment for Task t2 on UPLearn (opens in new tab)' })).toHaveTextContent('Assignment')
  })
})
