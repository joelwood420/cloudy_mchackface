import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { jsonResponse, mockApi, renderAt } from '../test/utils'

const modules = [
  { key: 'ccc601', code: 'CCC601', title: 'Public Cloud Administration', week_count: 0, task_count: 0, completed_count: 0, week_numbers: [], uplearn_url: null },
  { key: 'ccc602', code: 'CCC602', title: 'Data Engineering in the Public Cloud', week_count: 8, task_count: 40, completed_count: 0, week_numbers: [], uplearn_url: 'https://up.test/602' },
]
const detail = { key: 'ccc602', code: 'CCC602', title: 'Data Engineering in the Public Cloud', uplearn_url: null, submodules: [], weeks: [], assessments: [] }

const nav = () => screen.getByRole('navigation', { name: 'Main' })

describe('Sidebar', () => {
  it('shows the brand and lists modules with links and progress', async () => {
    mockApi({ '/api/modules': modules })
    renderAt('/')
    await screen.findByRole('navigation', { name: 'Main' })
    expect(within(nav()).getByText('Cloudy McHackface')).toBeInTheDocument()
    const link = await within(nav()).findByRole('link', { name: /Data Engineering in the Public Cloud/ })
    expect(link).toHaveAttribute('href', '/modules/ccc602')
    expect(link.querySelector('.progress')).toHaveAttribute('aria-hidden', 'true')
    expect(within(nav()).queryByRole('progressbar')).toBeNull()
  })

  it('marks Modules as current and shows This week and Assessments as coming soon', async () => {
    mockApi({ '/api/modules': modules })
    renderAt('/')
    await screen.findByRole('navigation', { name: 'Main' })
    expect(within(nav()).getByRole('link', { name: 'Modules' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav()).queryByRole('link', { name: /This week/ })).toBeNull()
    expect(within(nav()).queryByRole('link', { name: /^Assessments/ })).toBeNull()
    expect(within(nav()).getByText('This week').closest('[aria-disabled="true"]')).not.toBeNull()
    expect(within(nav()).getAllByText('Soon')).toHaveLength(2)
  })

  it('highlights the module being viewed', async () => {
    mockApi({ '/api/modules': modules, '/api/modules/ccc602': detail })
    renderAt('/modules/ccc602')
    await screen.findByRole('navigation', { name: 'Main' })
    const current = await within(nav()).findByRole('link', { name: /Data Engineering in the Public Cloud/ })
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(within(nav()).getByRole('link', { name: /Public Cloud Administration/ })).not.toHaveAttribute('aria-current')
    expect(within(nav()).getByRole('link', { name: 'Modules' })).toHaveAttribute('aria-current', 'true')
  })

  it('renders a skip link that targets the main content', async () => {
    mockApi({ '/api/modules': modules })
    const { container } = renderAt('/')
    await screen.findByRole('navigation', { name: 'Main' })
    const skip = screen.getByRole('link', { name: 'Skip to content' })
    expect(skip).toHaveAttribute('href', '#main-content')
    expect(container.querySelector('#main-content')).not.toBeNull()
    await within(nav()).findByRole('link', { name: /Data Engineering/ })
  })

  it('stays quiet when the module list fails', async () => {
    mockApi({ '/api/modules': () => jsonResponse({ detail: 'Boom' }, 500), '/api/modules/ccc602': detail })
    renderAt('/modules/ccc602')
    await screen.findByRole('navigation', { name: 'Main' })
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(within(nav()).queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(within(nav()).queryByText('Your modules')).toBeNull()
  })
})
