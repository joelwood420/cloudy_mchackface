import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ModuleDetail } from '../api'
import { withPrerequisiteDone, withTaskDone } from '../progress'
import { THIS_WEEK, jsonResponse, mockApi, renderAt } from '../test/utils'

const summary = [
  { key: 'ccc602', code: 'CCC602', title: 'Data Engineering in the Public Cloud', week_count: 2, task_count: 2, completed_count: 0, week_numbers: [9, 10], uplearn_url: 'https://up.test/602' },
]
const azure = {
  key: 'azure-account',
  title: 'Create an Azure account',
  note: 'Use a personal email.',
  external_url: 'https://azure.test/free',
  uplearn_url: 'https://up.test/how-azure',
  completed: false,
}

const detail = {
  key: 'ccc602',
  code: 'CCC602',
  title: 'Data Engineering in the Public Cloud',
  uplearn_url: 'https://up.test/602',
  weeks: [
    {
      key: 'ccc602-w09',
      submodule_key: 'dp900',
      week_number: 9,
      title: 'DP-900 Learning Paths 1–4',
      tasks: [
        {
          key: 't1',
          title: 'DP-900 LP1',
          type: 'learning_path',
          external_url: 'https://learn.test/lp1',
          uplearn_url: null,
          note: 'Skillable lab: the training key is in the Teams tutor-only channel.',
          done: true,
        },
        { key: 't2', title: 'Read the A3 brief', type: 'assessment_step', external_url: null, uplearn_url: 'https://up.test/a3', note: null, done: false },
      ],
    },
    { key: 'ccc602-w10', submodule_key: 'dp203', week_number: 10, title: 'Quiet week', tasks: [] },
  ],
  submodules: [
    {
      key: 'dp900',
      code: 'DP-900',
      title: 'Azure Data Fundamentals',
      uplearn_url: 'https://up.test/dp900',
      first_week: 9,
      last_week: 9,
      prerequisites: [
        azure,
        { key: 'skillable-dp900', title: 'Register for the DP-900 Skillable class', note: null, external_url: null, uplearn_url: 'https://up.test/how-skillable', completed: false },
      ],
    },
    { key: 'dp203', code: 'DP-203', title: 'Azure Data Engineer', uplearn_url: null, first_week: 10, last_week: 10, prerequisites: [azure] },
  ],
  assessments: [
    { key: 'a3', title: 'Assessment 3', due_date: '2026-10-25', uplearn_url: 'https://up.test/a3', submitted: false, status: 'upcoming', days_until: 8 },
    { key: 'a4', title: 'Assessment 4', due_date: null, uplearn_url: null, submitted: false, status: 'no_date', days_until: null },
  ],
}

async function open(moduleDetail: unknown = detail) {
  mockApi({ '/api/modules': summary, '/api/modules/ccc602': moduleDetail })
  renderAt('/modules/ccc602')
  await screen.findByRole('heading', { level: 1, name: 'Data Engineering in the Public Cloud' })
  return screen.getByRole('main')
}

describe('ModulePage', () => {
  it('shows the breadcrumb, title and week summary', async () => {
    const main = await open()
    const crumbs = within(main).getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumbs).getByRole('link', { name: 'Modules' })).toHaveAttribute('href', '/modules')
    expect(within(crumbs).getByText('CCC602')).toHaveAttribute('aria-current', 'page')
    expect(within(main).getByText('Weeks 9–10 · 2 weeks · 2 tasks')).toBeInTheDocument()
  })

  it('shows real module progress', async () => {
    const main = await open()
    expect(within(main).getByRole('progressbar', { name: 'Module progress' })).toHaveAttribute('aria-valuenow', '50')
    expect(within(main).getByText('50%')).toBeInTheDocument()
    expect(within(main).getByText('Tasks done').nextElementSibling).toHaveTextContent('1/2')
    expect(within(main).getByText('Weeks complete').nextElementSibling).toHaveTextContent('0/1')
    expect(within(main).getByRole('button', { name: /Week 9/ })).toHaveTextContent('1/2 done')
  })

  it('starts with weeks collapsed and opens one at a time', async () => {
    const main = await open()
    const week9 = within(main).getByRole('button', { name: /Week 9/ })
    const week10 = within(main).getByRole('button', { name: /Week 10/ })
    expect(week9).toHaveAttribute('aria-expanded', 'false')
    expect(within(main).queryByText('DP-900 LP1')).toBeNull()

    await userEvent.click(week9)
    expect(week9).toHaveAttribute('aria-expanded', 'true')
    expect(within(main).getByText('DP-900 LP1')).toBeInTheDocument()

    await userEvent.click(week10)
    expect(week9).toHaveAttribute('aria-expanded', 'false')
    expect(week10).toHaveAttribute('aria-expanded', 'true')
    expect(within(main).queryByText('DP-900 LP1')).toBeNull()
    expect(within(main).getByText('No tasks listed for this week.')).toBeInTheDocument()

    await userEvent.click(week10)
    expect(week10).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows task rows with tick boxes, type tags and named links', async () => {
    const main = await open()
    await userEvent.click(within(main).getByRole('button', { name: /Week 9/ }))

    const lp1 = within(main).getByText('DP-900 LP1').closest('li')!
    const box = within(lp1).getByRole('checkbox', { name: 'DP-900 LP1' })
    expect(box).toBeEnabled()
    expect(box).toBeChecked()
    expect(within(lp1).getByText('Learning path')).toBeInTheDocument()
    const openLink = within(lp1).getByRole('link', { name: 'Open DP-900 LP1 (opens in new tab)' })
    expect(openLink).toHaveAttribute('href', 'https://learn.test/lp1')
    expect(openLink).toHaveAttribute('target', '_blank')
    expect(openLink).toHaveAttribute('rel', 'noopener noreferrer')

    const brief = within(main).getByText('Read the A3 brief').closest('li')!
    expect(within(brief).getByRole('checkbox', { name: 'Read the A3 brief' })).not.toBeChecked()
    expect(within(brief).getByText('Assessment')).toBeInTheDocument()
    expect(within(brief).queryByRole('link', { name: /^Open/ })).toBeNull()
    expect(within(brief).getByRole('link', { name: 'Read the A3 brief on UPLearn (opens in new tab)' })).toHaveAttribute('href', 'https://up.test/a3')
  })

  it('ticks a task and progress follows', async () => {
    // The server remembers the tick, so the refetch after saving agrees with the optimistic update.
    let t2Done = false
    const fetchMock = mockApi({
      '/api/modules': summary,
      '/api/modules/ccc602': () => jsonResponse(withTaskDone(detail as ModuleDetail, 't2', t2Done)),
      'PUT /api/tasks/t2/complete': () => {
        t2Done = true
        return new Response(null, { status: 204 })
      },
    })
    renderAt('/modules/ccc602')
    await screen.findByRole('heading', { level: 1, name: 'Data Engineering in the Public Cloud' })
    const main = screen.getByRole('main')
    await userEvent.click(within(main).getByRole('button', { name: /Week 9/ }))
    await userEvent.click(within(main).getByRole('checkbox', { name: 'Read the A3 brief' }))
    expect(await within(main).findByRole('checkbox', { name: 'Read the A3 brief', checked: true })).toBeInTheDocument()
    await waitFor(() =>
      expect(within(main).getByRole('progressbar', { name: 'Module progress' })).toHaveAttribute('aria-valuenow', '100'),
    )
    expect(fetchMock).toHaveBeenCalledWith('/api/tasks/t2/complete', expect.objectContaining({ method: 'PUT' }))
  })

  it('rewards the tick that clears a week and passes a module milestone', async () => {
    let t2Done = false
    mockApi({
      '/api/modules': () => jsonResponse([{ ...summary[0], completed_count: t2Done ? 2 : 1 }]),
      '/api/modules/ccc602': () => jsonResponse(withTaskDone(detail as ModuleDetail, 't2', t2Done)),
      'PUT /api/tasks/t2/complete': () => {
        t2Done = true
        return new Response(null, { status: 204 })
      },
    })
    renderAt('/modules/ccc602')
    await screen.findByRole('heading', { level: 1, name: 'Data Engineering in the Public Cloud' })
    const main = screen.getByRole('main')
    await userEvent.click(within(main).getByRole('button', { name: /Week 9/ }))
    await userEvent.click(within(main).getByRole('checkbox', { name: 'Read the A3 brief' }))
    expect(await within(main).findByText('> week_9 :: all tasks patched')).toBeInTheDocument()
    expect(await screen.findByText('CCC602 · system owned. 100% complete.')).toBeInTheDocument()
  })

  it('unticks a task and rolls back when saving fails', async () => {
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    let gets = 0
    mockApi({
      '/api/modules': summary,
      // The refetch after the failure never answers, so only a real rollback can restore the box.
      '/api/modules/ccc602': () => (++gets === 1 ? jsonResponse(detail) : new Promise<Response>(() => {})),
      'DELETE /api/tasks/t1/complete': async () => {
        await held
        return jsonResponse({ detail: 'Boom' }, 500)
      },
    })
    renderAt('/modules/ccc602')
    await screen.findByRole('heading', { level: 1, name: 'Data Engineering in the Public Cloud' })
    const main = screen.getByRole('main')
    await userEvent.click(within(main).getByRole('button', { name: /Week 9/ }))
    await userEvent.click(within(main).getByRole('checkbox', { name: 'DP-900 LP1' }))
    expect(within(main).getByRole('checkbox', { name: 'DP-900 LP1' })).not.toBeChecked()
    expect(within(main).getByRole('progressbar', { name: 'Module progress' })).toHaveAttribute('aria-valuenow', '0')

    release()
    expect(await within(main).findByRole('alert')).toHaveTextContent("Couldn't save that tick. Try again.")
    expect(within(main).getByRole('checkbox', { name: 'DP-900 LP1' })).toBeChecked()
    expect(within(main).getByRole('progressbar', { name: 'Module progress' })).toHaveAttribute('aria-valuenow', '50')
  })

  it('refetches once, after the last of two quick ticks has settled', async () => {
    const serverDone = { t1: true, t2: false }
    let gets = 0
    const gate = (key: 't1' | 't2', value: boolean) => {
      let release!: () => void
      const held = new Promise<void>((resolve) => (release = resolve))
      const handler = async () => {
        await held
        serverDone[key] = value
        return new Response(null, { status: 204 })
      }
      return { release, handler }
    }
    const untickT1 = gate('t1', false)
    const tickT2 = gate('t2', true)
    mockApi({
      '/api/modules': summary,
      '/api/modules/ccc602': () => {
        gets += 1
        const w = detail.weeks[0]
        const tasks = w.tasks.map((t) => ({ ...t, done: serverDone[t.key as 't1' | 't2'] }))
        return jsonResponse({ ...detail, weeks: [{ ...w, tasks }, detail.weeks[1]] })
      },
      'DELETE /api/tasks/t1/complete': untickT1.handler,
      'PUT /api/tasks/t2/complete': tickT2.handler,
    })
    renderAt('/modules/ccc602')
    await screen.findByRole('heading', { level: 1, name: 'Data Engineering in the Public Cloud' })
    const main = screen.getByRole('main')
    await userEvent.click(within(main).getByRole('button', { name: /Week 9/ }))
    expect(gets).toBe(1)

    await userEvent.click(within(main).getByRole('checkbox', { name: 'DP-900 LP1' }))
    await userEvent.click(within(main).getByRole('checkbox', { name: 'Read the A3 brief' }))
    expect(within(main).getByRole('checkbox', { name: 'DP-900 LP1' })).not.toBeChecked()
    expect(within(main).getByRole('checkbox', { name: 'Read the A3 brief' })).toBeChecked()

    untickT1.release()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(gets).toBe(1)

    tickT2.release()
    await waitFor(() => expect(gets).toBe(2))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(gets).toBe(2)
    expect(within(main).getByRole('checkbox', { name: 'DP-900 LP1' })).not.toBeChecked()
    expect(within(main).getByRole('checkbox', { name: 'Read the A3 brief' })).toBeChecked()
    expect(within(main).getByRole('progressbar', { name: 'Module progress' })).toHaveAttribute('aria-valuenow', '50')
  })

  it('uses headings for assessment titles', async () => {
    const main = await open()
    const rail = within(main).getByRole('complementary', { name: 'Assessments' })
    expect(within(rail).getByRole('heading', { level: 3, name: 'Assessment 3' })).toBeInTheDocument()
  })

  it('shows a task note as a hint under the title', async () => {
    const main = await open()
    await userEvent.click(within(main).getByRole('button', { name: /Week 9/ }))

    const lp1 = within(main).getByText('DP-900 LP1').closest('li')!
    expect(within(lp1).getByText('Skillable lab: the training key is in the Teams tutor-only channel.')).toBeInTheDocument()
    const box = within(lp1).getByRole('checkbox', { name: 'DP-900 LP1' })
    expect(box).toHaveAccessibleDescription('Skillable lab: the training key is in the Teams tutor-only channel.')

    const brief = within(main).getByText('Read the A3 brief').closest('li')!
    expect(brief.querySelector('.task-note')).toBeNull()
    expect(within(brief).getByRole('checkbox', { name: 'Read the A3 brief' })).not.toHaveAttribute('aria-describedby')
  })

  it('shows the assessments rail and the portal button', async () => {
    const main = await open()
    const rail = within(main).getByRole('complementary', { name: 'Assessments' })
    expect(within(rail).getByText('Assessment 3').closest('li')).toHaveTextContent(/Due Sun, 25 Oct 2026/)
    expect(within(rail).getByText('Assessment 4').closest('li')).toHaveTextContent('Due date: see programme guide')
    expect(within(rail).getByRole('link', { name: 'CCC602 course page on UPLearn (opens in new tab)' })).toHaveAttribute('href', 'https://up.test/602')
  })

  it('hides the portal button when the module has no portal link', async () => {
    const main = await open({ ...detail, uplearn_url: null })
    expect(within(main).queryByRole('link', { name: /course page on UPLearn/ })).toBeNull()
  })

  it('shows "Module not found" for an unknown key', async () => {
    mockApi({ '/api/modules': summary })
    renderAt('/modules/nope')
    expect(await screen.findByRole('heading', { name: 'Module not found' })).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Back to modules' })).toHaveAttribute('href', '/modules')
  })

  it('shows an error with retry for server errors', async () => {
    mockApi({ '/api/modules': summary, '/api/modules/ccc602': () => jsonResponse({ detail: 'Boom' }, 500) })
    renderAt('/modules/ccc602')
    expect(await screen.findByRole('alert')).toHaveTextContent('Boom')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('groups weeks under submodule headings with their week range', async () => {
    const main = await open()
    const dp900 = within(main).getByRole('region', { name: 'DP-900 · Azure Data Fundamentals' })
    expect(dp900.querySelector('.submodule-head')).toHaveTextContent('Week 9')
    expect(within(dp900).getByRole('button', { name: /Week 9/ })).toBeInTheDocument()
    expect(within(dp900).queryByRole('button', { name: /Week 10/ })).toBeNull()
    expect(within(dp900).getByRole('link', { name: 'DP-900 on UPLearn (opens in new tab)' })).toHaveAttribute('href', 'https://up.test/dp900')

    const dp203 = within(main).getByRole('region', { name: 'DP-203 · Azure Data Engineer' })
    expect(within(dp203).getByRole('button', { name: /Week 10/ })).toBeInTheDocument()
    expect(within(dp203).queryByRole('link', { name: /on UPLearn/ })).toBeNull()
  })

  it('shows a Before you start box with links for each prerequisite', async () => {
    const main = await open()
    const dp900 = within(main).getByRole('region', { name: 'DP-900 · Azure Data Fundamentals' })
    expect(within(dp900).getByRole('heading', { name: 'Before you start' })).toBeInTheDocument()

    const azureItem = within(dp900).getByText('Create an Azure account').closest('li')!
    expect(within(azureItem).getByText('Use a personal email.')).toBeInTheDocument()
    const doIt = within(azureItem).getByRole('link', { name: 'Do it: Create an Azure account (opens in new tab)' })
    expect(doIt).toHaveAttribute('href', 'https://azure.test/free')
    expect(doIt).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(azureItem).getByRole('link', { name: 'Watch the guide: Create an Azure account (opens in new tab)' })).toHaveAttribute(
      'href',
      'https://up.test/how-azure',
    )

    const skillable = within(dp900).getByText('Register for the DP-900 Skillable class').closest('li')!
    expect(within(skillable).queryByRole('link', { name: /^Do it/ })).toBeNull()
    expect(within(skillable).getByRole('link', { name: /^Watch the guide/ })).toBeInTheDocument()
  })

  it('shows a shared prerequisite under every submodule that uses it', async () => {
    const main = await open()
    expect(within(main).getAllByText('Create an Azure account')).toHaveLength(2)
  })

  it('leaves out the box when a submodule has no prerequisites', async () => {
    const main = await open({ ...detail, submodules: [detail.submodules[0], { ...detail.submodules[1], prerequisites: [] }] })
    const dp203 = within(main).getByRole('region', { name: 'DP-203 · Azure Data Engineer' })
    expect(within(dp203).queryByRole('heading', { name: 'Before you start' })).toBeNull()
  })

  it('still shows weeks whose submodule is missing from the list', async () => {
    const main = await open({ ...detail, submodules: [detail.submodules[0]] })
    expect(within(main).getByRole('button', { name: /Week 10/ })).toBeInTheDocument()
  })

  it('ticks a prerequisite and hides it everywhere it is shared, without moving progress', async () => {
    let azureDone = false
    const fetchMock = mockApi({
      '/api/modules': summary,
      '/api/modules/ccc602': () => jsonResponse(withPrerequisiteDone(detail as ModuleDetail, 'azure-account', azureDone)),
      'PUT /api/prerequisites/azure-account/complete': () => {
        azureDone = true
        return new Response(null, { status: 204 })
      },
    })
    renderAt('/modules/ccc602')
    await screen.findByRole('heading', { level: 1, name: 'Data Engineering in the Public Cloud' })
    const main = screen.getByRole('main')
    const progressBefore = within(main).getByRole('progressbar', { name: 'Module progress' }).getAttribute('aria-valuenow')
    const dp900 = within(main).getByRole('region', { name: 'DP-900 · Azure Data Fundamentals' })

    await userEvent.click(within(dp900).getByRole('checkbox', { name: 'Create an Azure account' }))

    await waitFor(() => expect(within(main).queryByText('Create an Azure account')).toBeNull())
    expect(within(dp900).getByRole('checkbox', { name: 'Register for the DP-900 Skillable class' })).not.toBeChecked()
    const dp203 = within(main).getByRole('region', { name: 'DP-203 · Azure Data Engineer' })
    expect(within(dp203).getByText("You're ready to start learning.")).toBeInTheDocument()
    expect(within(main).getByRole('progressbar', { name: 'Module progress' })).toHaveAttribute('aria-valuenow', progressBefore!)
    expect(fetchMock).toHaveBeenCalledWith('/api/prerequisites/azure-account/complete', expect.objectContaining({ method: 'PUT' }))
  })

  it('shows done prerequisites on request so they can be unticked', async () => {
    const ticked = withPrerequisiteDone(detail as ModuleDetail, 'azure-account', true)
    const fetchMock = mockApi({
      '/api/modules': summary,
      '/api/modules/ccc602': ticked,
      'DELETE /api/prerequisites/azure-account/complete': () => new Response(null, { status: 204 }),
    })
    renderAt('/modules/ccc602')
    await screen.findByRole('heading', { level: 1, name: 'Data Engineering in the Public Cloud' })
    const main = screen.getByRole('main')
    const dp203 = within(main).getByRole('region', { name: 'DP-203 · Azure Data Engineer' })
    expect(within(dp203).queryByRole('checkbox')).toBeNull()

    await userEvent.click(within(dp203).getByRole('button', { name: 'Show done (1)' }))
    const box = within(dp203).getByRole('checkbox', { name: 'Create an Azure account' })
    expect(box).toBeChecked()
    await userEvent.click(box)
    expect(fetchMock).toHaveBeenCalledWith('/api/prerequisites/azure-account/complete', expect.objectContaining({ method: 'DELETE' }))
  })

  it('brings a prerequisite back when saving the tick fails', async () => {
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    let gets = 0
    mockApi({
      '/api/modules': summary,
      // The refetch after the failure never answers, so only a real rollback can restore the box.
      '/api/modules/ccc602': () => (++gets === 1 ? jsonResponse(detail) : new Promise<Response>(() => {})),
      'PUT /api/prerequisites/azure-account/complete': async () => {
        await held
        return jsonResponse({ detail: 'Boom' }, 500)
      },
    })
    renderAt('/modules/ccc602')
    await screen.findByRole('heading', { level: 1, name: 'Data Engineering in the Public Cloud' })
    const main = screen.getByRole('main')
    const dp900 = within(main).getByRole('region', { name: 'DP-900 · Azure Data Fundamentals' })
    await userEvent.click(within(dp900).getByRole('checkbox', { name: 'Create an Azure account' }))
    expect(within(main).queryByText('Create an Azure account')).toBeNull()

    release()
    expect(await within(main).findByRole('alert')).toHaveTextContent("Couldn't save that tick. Try again.")
    expect(within(dp900).getByRole('checkbox', { name: 'Create an Azure account' })).not.toBeChecked()
  })

  it('refreshes the module list when a prerequisite tick settles last after a task tick', async () => {
    let modulesGets = 0
    let releaseTask!: () => void
    let releasePrereq!: () => void
    const taskHeld = new Promise<void>((resolve) => (releaseTask = resolve))
    const prereqHeld = new Promise<void>((resolve) => (releasePrereq = resolve))
    mockApi({
      '/api/modules': () => {
        modulesGets += 1
        return jsonResponse(summary)
      },
      '/api/modules/ccc602': detail,
      'PUT /api/tasks/t2/complete': async () => {
        await taskHeld
        return new Response(null, { status: 204 })
      },
      'PUT /api/prerequisites/azure-account/complete': async () => {
        await prereqHeld
        return new Response(null, { status: 204 })
      },
    })
    renderAt('/modules/ccc602')
    await screen.findByRole('heading', { level: 1, name: 'Data Engineering in the Public Cloud' })
    const main = screen.getByRole('main')
    await waitFor(() => expect(modulesGets).toBeGreaterThan(0))
    await userEvent.click(within(main).getByRole('button', { name: /Week 9/ }))
    const dp900 = within(main).getByRole('region', { name: 'DP-900 · Azure Data Fundamentals' })

    await userEvent.click(within(main).getByRole('checkbox', { name: 'Read the A3 brief' }))
    await userEvent.click(within(dp900).getByRole('checkbox', { name: 'Create an Azure account' }))
    const before = modulesGets

    releaseTask()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(modulesGets).toBe(before)

    releasePrereq()
    await waitFor(() => expect(modulesGets).toBe(before + 1))
  })

  it('opens the current week and marks it', async () => {
    mockApi({ '/api/this-week': { ...THIS_WEEK, week: { week_number: 10, starts_on: '2026-10-05', ends_on: '2026-10-11' } }, '/api/modules': summary, '/api/modules/ccc602': detail })
    renderAt('/modules/ccc602')
    await screen.findByRole('heading', { level: 1, name: 'Data Engineering in the Public Cloud' })
    const main = screen.getByRole('main')
    const week10 = within(main).getByRole('button', { name: /Week 10/ })
    expect(week10).toHaveAttribute('aria-expanded', 'true')
    expect(within(week10).getByText('Current week')).toBeInTheDocument()
    expect(within(main).getByRole('button', { name: /Week 9/ })).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('ModulePage schedule posts', () => {
  it("links the week's schedule post at the top of the open week", async () => {
    const post = 'https://yoobee.uplearn.education/mod/forum/discuss.php?d=9'
    const withPost = { ...detail, weeks: [{ ...detail.weeks[0], schedule_post_url: post }, detail.weeks[1]] }
    const main = await open(withPost)
    await userEvent.click(within(main).getByRole('button', { name: /Week 9/ }))
    expect(within(main).getByRole('link', { name: 'Week 9 schedule post (opens in new tab)' })).toHaveAttribute('href', post)
  })
})

describe('ModulePage current week', () => {
  it('opens the current week once this week loads after the module', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => { release = r })
    mockApi({
      '/api/modules': summary,
      '/api/modules/ccc602': detail,
      '/api/this-week': async () => { await gate; return jsonResponse({ ...THIS_WEEK, week: { week_number: 9, starts_on: '2026-09-28', ends_on: '2026-10-04' } }) },
    })
    renderAt('/modules/ccc602')
    await screen.findByRole('heading', { level: 1, name: 'Data Engineering in the Public Cloud' })
    const main = screen.getByRole('main')
    const week9 = await within(main).findByRole('button', { name: /Week 9/ })
    expect(week9).toHaveAttribute('aria-expanded', 'false')
    release()
    await waitFor(() => expect(week9).toHaveAttribute('aria-expanded', 'true'))
  })

  it("leaves the weeks as you set them when this week loads later", async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => { release = r })
    mockApi({
      '/api/modules': summary,
      '/api/modules/ccc602': detail,
      '/api/this-week': async () => { await gate; return jsonResponse({ ...THIS_WEEK, week: { week_number: 9, starts_on: '2026-09-28', ends_on: '2026-10-04' } }) },
    })
    renderAt('/modules/ccc602')
    await screen.findByRole('heading', { level: 1, name: 'Data Engineering in the Public Cloud' })
    const main = screen.getByRole('main')
    const week10 = await within(main).findByRole('button', { name: /Week 10/ })
    await userEvent.click(week10)
    release()
    await within(main).findByText('Current week')
    expect(week10).toHaveAttribute('aria-expanded', 'true')
    expect(within(main).getByRole('button', { name: /Week 9/ })).toHaveAttribute('aria-expanded', 'false')
  })
})
