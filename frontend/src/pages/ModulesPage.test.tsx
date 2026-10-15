import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { jsonResponse, mockApi, renderAt } from '../test/utils'

const modules = [
  { key: 'ccc601', code: 'CCC601', title: 'Public Cloud Administration', week_count: 0, task_count: 0, uplearn_url: null },
  { key: 'ccc602', code: 'CCC602', title: 'Data Engineering in the Public Cloud', week_count: 8, task_count: 30, uplearn_url: 'https://up.test/602' },
]

async function loadedMain() {
  await screen.findByRole('heading', { level: 1, name: 'Modules' })
  return screen.getByRole('main')
}

describe('ModulesPage', () => {
  it('lists modules as cards with links, counts and progress', async () => {
    mockApi({ '/api/modules': modules })
    renderAt('/')
    const main = await loadedMain()
    const link = await within(main).findByRole('link', { name: /Data Engineering in the Public Cloud/ })
    expect(link).toHaveAttribute('href', '/modules/ccc602')
    expect(within(main).getByText('8 weeks · 30 tasks')).toBeInTheDocument()
    expect(within(main).getByRole('progressbar', { name: 'CCC602 progress' })).toHaveAttribute('aria-valuenow', '0')
  })

  it('uses singular forms for one week and one task', async () => {
    mockApi({ '/api/modules': [{ key: 'ccc603', code: 'CCC603', title: 'Single', week_count: 1, task_count: 1, uplearn_url: null }] })
    renderAt('/')
    const main = await loadedMain()
    expect(await within(main).findByText('1 week · 1 task')).toBeInTheDocument()
  })

  it('shows a hint when there are no modules', async () => {
    mockApi({ '/api/modules': [] })
    renderAt('/')
    expect(await screen.findByText(/No modules yet/)).toBeInTheDocument()
  })

  it('shows an error and retries', async () => {
    let calls = 0
    mockApi({
      '/api/modules': () => (++calls === 1 ? jsonResponse({ detail: 'Server exploded' }, 500) : jsonResponse(modules)),
    })
    renderAt('/')
    expect(await screen.findByRole('alert')).toHaveTextContent('Server exploded')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    const main = await loadedMain()
    expect(await within(main).findByRole('link', { name: /Public Cloud Administration/ })).toBeInTheDocument()
    expect(calls).toBe(2)
  })

  it('shows an error when the backend is unreachable', async () => {
    mockApi({
      '/api/modules': () => {
        throw new TypeError('Failed to fetch')
      },
    })
    renderAt('/')
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to fetch')
  })
})
