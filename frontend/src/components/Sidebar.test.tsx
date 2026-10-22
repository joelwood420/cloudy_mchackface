import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { jsonResponse, mockApi, renderAt } from '../test/utils'

const modules = [
  { key: 'ccc601', code: 'CCC601', title: 'Public Cloud Administration', week_count: 0, task_count: 0, completed_count: 0, week_numbers: [], uplearn_url: null },
  { key: 'ccc602', code: 'CCC602', title: 'Data Engineering in the Public Cloud', week_count: 8, task_count: 40, completed_count: 10, week_numbers: [], uplearn_url: 'https://up.test/602' },
]
const detail = { key: 'ccc602', code: 'CCC602', title: 'Data Engineering in the Public Cloud', uplearn_url: null, submodules: [], weeks: [], assessments: [] }

const nav = () => screen.getByRole('navigation', { name: 'Main' })

describe('Sidebar', () => {
  it('shows the brand and lists modules with links and progress', async () => {
    mockApi({ '/api/modules': modules })
    renderAt('/modules')
    await screen.findByRole('navigation', { name: 'Main' })
    expect(within(nav()).getByText('Cloudy McHackface')).toBeInTheDocument()
    const link = await within(nav()).findByRole('link', { name: /Data Engineering in the Public Cloud/ })
    expect(link).toHaveAttribute('href', '/modules/ccc602')
    expect(link).toHaveTextContent('25%')
    expect(link.querySelector('.progress')).toHaveAttribute('aria-hidden', 'true')
    expect(within(nav()).queryByRole('progressbar')).toBeNull()
  })

  it('links This week, Modules, Assessments and Settings', async () => {
    mockApi({ '/api/modules': modules })
    renderAt('/modules')
    await screen.findByRole('navigation', { name: 'Main' })
    await within(nav()).findByText('CCC602')
    expect(within(nav()).getByRole('link', { name: 'This week' })).toHaveAttribute('href', '/')
    expect(within(nav()).getByRole('link', { name: 'Modules' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav()).getByRole('link', { name: 'Assessments' })).toHaveAttribute('href', '/assessments')
    expect(within(nav()).getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings')
  })

  it('shows where you are in the programme in the footer', async () => {
    mockApi({ '/api/modules': modules })
    renderAt('/modules')
    await screen.findByRole('navigation', { name: 'Main' })
    expect(await within(nav()).findByText('Week 11 · 12–18 Oct')).toBeInTheDocument()
  })

  it('greys out a module that is coming soon', async () => {
    mockApi({ '/api/modules': [...modules, { key: 'ccc604', code: 'CCC604', title: 'Multi-Cloud', submodule_count: 0, week_count: 0, task_count: 0, completed_count: 0, week_numbers: [], uplearn_url: null }] })
    renderAt('/modules')
    await screen.findByRole('navigation', { name: 'Main' })
    const item = (await within(nav()).findByText('Multi-Cloud')).closest('li')!
    expect(within(item).getByText('Soon')).toBeInTheDocument()
    expect(within(item).queryByRole('link')).not.toBeInTheDocument()
  })

  it('highlights the module being viewed', async () => {
    mockApi({ '/api/modules': modules, '/api/modules/ccc602': detail })
    renderAt('/modules/ccc602')
    await screen.findByRole('navigation', { name: 'Main' })
    const current = await within(nav()).findByRole('link', { name: /Data Engineering in the Public Cloud/ })
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(within(nav()).queryByRole('link', { name: /Public Cloud Administration/ })).not.toBeInTheDocument()
    expect(within(nav()).getByRole('link', { name: 'Modules' })).toHaveAttribute('aria-current', 'true')
  })

  it('renders a skip link that targets the main content', async () => {
    mockApi({ '/api/modules': modules })
    const { container } = renderAt('/modules')
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

describe('Sidebar phone menu', () => {
  it('opens and closes, and closes itself when you move to another page', async () => {
    mockApi({ '/api/modules': modules, '/api/modules/ccc602': detail })
    renderAt('/modules')
    const menu = await within(await screen.findByRole('navigation', { name: 'Main' })).findByRole('button', { name: 'Menu' })
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(menu)
    expect(within(nav()).getByRole('button', { name: 'Close' })).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(await within(nav()).findByRole('link', { name: /Data Engineering in the Public Cloud/ }))
    expect(await within(nav()).findByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false')
  })
})
