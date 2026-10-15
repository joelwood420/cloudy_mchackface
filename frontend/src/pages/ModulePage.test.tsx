import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { jsonResponse, mockApi, renderAt } from '../test/utils'

const summary = [
  { key: 'ccc602', code: 'CCC602', title: 'Data Engineering in the Public Cloud', week_count: 2, task_count: 2, uplearn_url: 'https://up.test/602' },
]
const detail = {
  key: 'ccc602',
  code: 'CCC602',
  title: 'Data Engineering in the Public Cloud',
  uplearn_url: 'https://up.test/602',
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
    expect(within(crumbs).getByRole('link', { name: 'Modules' })).toHaveAttribute('href', '/')
    expect(within(crumbs).getByText('CCC602')).toHaveAttribute('aria-current', 'page')
    expect(within(main).getByText('Weeks 9–10 · 2 weeks · 2 tasks')).toBeInTheDocument()
  })

  it('shows the progress card at zero with the sign-in note', async () => {
    const main = await open()
    expect(within(main).getByRole('progressbar', { name: 'Module progress' })).toHaveAttribute('aria-valuenow', '0')
    expect(within(main).getByText('Progress tracking arrives with sign-in.')).toBeInTheDocument()
    expect(within(main).getByText('Tasks done').nextElementSibling).toHaveTextContent('0/2')
    expect(within(main).getByText('Weeks complete').nextElementSibling).toHaveTextContent('0/2')
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

  it('shows task rows with disabled tick boxes, type tags and safe links', async () => {
    const main = await open()
    await userEvent.click(within(main).getByRole('button', { name: /Week 9/ }))

    const lp1 = within(main).getByText('DP-900 LP1').closest('li')!
    expect(within(lp1).getByRole('checkbox', { name: 'DP-900 LP1' })).toBeDisabled()
    expect(within(lp1).getByText('Learning path')).toBeInTheDocument()
    const openLink = within(lp1).getByRole('link', { name: 'Open' })
    expect(openLink).toHaveAttribute('href', 'https://learn.test/lp1')
    expect(openLink).toHaveAttribute('target', '_blank')
    expect(openLink).toHaveAttribute('rel', 'noopener noreferrer')

    const brief = within(main).getByText('Read the A3 brief').closest('li')!
    expect(within(brief).getByText('Assessment')).toBeInTheDocument()
    expect(within(brief).queryByRole('link', { name: 'Open' })).toBeNull()
    expect(within(brief).getByRole('link', { name: 'UPLearn' })).toHaveAttribute('href', 'https://up.test/a3')
  })

  it('shows the assessments rail and the portal button', async () => {
    const main = await open()
    const rail = within(main).getByRole('complementary', { name: 'Assessments' })
    expect(within(rail).getByText('Assessment 3').closest('li')).toHaveTextContent(/Due Sun, 25 Oct 2026/)
    expect(within(rail).getByText('Assessment 4').closest('li')).toHaveTextContent('Due date: see programme guide')
    expect(within(rail).getByRole('link', { name: 'Open in Yoobee portal' })).toHaveAttribute('href', 'https://up.test/602')
  })

  it('hides the portal button when the module has no portal link', async () => {
    const main = await open({ ...detail, uplearn_url: null })
    expect(within(main).queryByRole('link', { name: 'Open in Yoobee portal' })).toBeNull()
  })

  it('shows "Module not found" for an unknown key', async () => {
    mockApi({ '/api/modules': summary })
    renderAt('/modules/nope')
    expect(await screen.findByRole('heading', { name: 'Module not found' })).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Back to modules' })).toHaveAttribute('href', '/')
  })

  it('shows an error with retry for server errors', async () => {
    mockApi({ '/api/modules': summary, '/api/modules/ccc602': () => jsonResponse({ detail: 'Boom' }, 500) })
    renderAt('/modules/ccc602')
    expect(await screen.findByRole('alert')).toHaveTextContent('Boom')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
