import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DISCLAIMER_VERSION } from '../disclaimer'
import { INTAKES, ME, jsonResponse, mockApi, renderAt } from '../test/utils'

const unauthorized = () => jsonResponse({ detail: 'Not logged in' }, 401)
const modules = [
  { key: 'ccc602', code: 'CCC602', title: 'Data Engineering in the Public Cloud', week_count: 1, task_count: 2, completed_count: 0, week_numbers: [9], uplearn_url: null },
]

describe('sign-in flow', () => {
  it('sends a logged-out visitor to the login page', async () => {
    mockApi({ '/api/me': unauthorized })
    renderAt('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Log in · Cloudy McHackface'))
  })

  it('logs in and returns to the page they asked for', async () => {
    let loggedIn = false
    const fetchMock = mockApi({
      '/api/me': () => (loggedIn ? jsonResponse(ME) : unauthorized()),
      'POST /api/auth/login': (init?: RequestInit) => {
        expect(JSON.parse(String(init?.body))).toEqual({ email: 'joel@example.com', password: 'correct horse' })
        loggedIn = true
        return jsonResponse(ME)
      },
      '/api/modules': modules,
      '/api/modules/ccc602': { key: 'ccc602', code: 'CCC602', title: 'Data Engineering in the Public Cloud', uplearn_url: null, submodules: [], weeks: [], assessments: [] },
    })
    renderAt('/modules/ccc602')
    await screen.findByRole('heading', { name: 'Log in' })
    await userEvent.type(screen.getByLabelText('Email'), 'joel@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Data Engineering in the Public Cloud' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ method: 'POST' }))
  })

  it("clears the previous user's cached data on login", async () => {
    let loggedIn = false
    let release: (r: Response) => void = () => {}
    const modulesCalls = vi.fn()
    mockApi({
      '/api/me': () => (loggedIn ? jsonResponse(ME) : unauthorized()),
      'POST /api/auth/login': () => {
        loggedIn = true
        return jsonResponse(ME)
      },
      '/api/modules': () => {
        modulesCalls()
        return new Promise<Response>((resolve) => (release = resolve))
      },
    })
    const { client } = renderAt('/login')
    client.setQueryData(['modules'], [{ ...modules[0], title: 'Stale Title' }])
    await userEvent.type(await screen.findByLabelText('Email'), 'joel@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    await waitFor(() => expect(modulesCalls).toHaveBeenCalled())
    expect(screen.queryAllByText('Stale Title')).toHaveLength(0)
    release(jsonResponse([{ ...modules[0], title: 'Fresh Title' }]))
    expect((await screen.findAllByText('Fresh Title')).length).toBeGreaterThan(0)
  })

  it('shows the server message when login fails', async () => {
    mockApi({
      '/api/me': unauthorized,
      'POST /api/auth/login': () => jsonResponse({ detail: 'Email or password is incorrect.' }, 401),
    })
    renderAt('/login')
    await userEvent.type(await screen.findByLabelText('Email'), 'joel@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong password')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.')
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('signs up, checking password length before sending', async () => {
    let loggedIn = false
    const fetchMock = mockApi({
      '/api/me': () => (loggedIn ? jsonResponse(ME) : unauthorized()),
      'POST /api/auth/signup': () => {
        loggedIn = true
        return jsonResponse(ME, 201)
      },
      '/api/modules': modules,
      '/api/intakes': INTAKES,
    })
    renderAt('/signup')
    await userEvent.type(await screen.findByLabelText('Email'), 'joel@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'short')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Use a password of at least 8 characters.')
    expect(fetchMock).not.toHaveBeenCalledWith('/api/auth/signup', expect.anything())

    await userEvent.type(screen.getByLabelText('Password'), ' and more')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Choose your intake.')
    expect(fetchMock).not.toHaveBeenCalledWith('/api/auth/signup', expect.anything())

    await userEvent.selectOptions(screen.getByLabelText('Intake'), await screen.findByRole('option', { name: /part-time/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Week 11' })).toBeInTheDocument()
    const signupCall = fetchMock.mock.calls.find(([url]) => url === '/api/auth/signup')
    expect(signupCall).toBeDefined()
    const init = signupCall![1] as RequestInit
    expect(JSON.parse(String(init.body))).toMatchObject({
      accepted_disclaimer_version: DISCLAIMER_VERSION,
      intake_key: '2607-online-ccc-pt',
    })
  })

  it('shows no catch-up note when nothing was pre-ticked', async () => {
    let loggedIn = false
    mockApi({
      '/api/me': () => (loggedIn ? jsonResponse(ME) : unauthorized()),
      'POST /api/auth/signup': () => {
        loggedIn = true
        return jsonResponse({ ...ME, prefilled_through_week: null }, 201)
      },
      '/api/modules': modules,
      '/api/intakes': INTAKES,
    })
    renderAt('/signup')
    await userEvent.type(await screen.findByLabelText('Email'), 'joel@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse')
    await userEvent.selectOptions(screen.getByLabelText('Intake'), await screen.findByRole('option', { name: /full-time/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Week 11' })).toBeInTheDocument()
    expect(screen.queryByText(/We've marked/)).not.toBeInTheDocument()
  })

  it('shows the catch-up note after signup even when sent from another page', async () => {
    let loggedIn = false
    mockApi({
      '/api/me': () => (loggedIn ? jsonResponse(ME) : unauthorized()),
      'POST /api/auth/signup': () => {
        loggedIn = true
        return jsonResponse({ ...ME, prefilled_through_week: 10 }, 201)
      },
      '/api/modules': modules,
      '/api/intakes': INTAKES,
    })
    renderAt({ pathname: '/signup', state: { from: '/modules/ccc602' } })
    await userEvent.type(await screen.findByLabelText('Email'), 'joel@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse')
    await userEvent.selectOptions(screen.getByLabelText('Intake'), await screen.findByRole('option', { name: /full-time/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Week 11' })).toBeInTheDocument()
    expect(screen.getByText(/We've marked weeks 1–10 as done/)).toBeInTheDocument()
  })

  it('links between log in and sign up', async () => {
    mockApi({ '/api/me': unauthorized })
    renderAt('/login')
    await userEvent.click(await screen.findByRole('link', { name: 'Create an account' }))
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Log in' }))
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('goes to the login page when the session runs out mid-visit', async () => {
    let meCalls = 0
    mockApi({
      '/api/me': () => (++meCalls === 1 ? jsonResponse(ME) : unauthorized()),
      '/api/modules': unauthorized,
    })
    renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('logs out from the sidebar', async () => {
    let loggedIn = true
    mockApi({
      '/api/me': () => (loggedIn ? jsonResponse(ME) : unauthorized()),
      'POST /api/auth/logout': () => {
        loggedIn = false
        return new Response(null, { status: 204 })
      },
      '/api/modules': modules,
    })
    renderAt('/')
    const nav = await screen.findByRole('navigation', { name: 'Main' })
    expect(within(nav).getByText('joel@example.com')).toBeInTheDocument()
    await userEvent.click(within(nav).getByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('shows a friendly message when the server is unreachable', async () => {
    mockApi({
      '/api/me': () => {
        throw new TypeError('Failed to fetch')
      },
    })
    renderAt('/')
    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server. Check your connection and try again.")
  })
})
