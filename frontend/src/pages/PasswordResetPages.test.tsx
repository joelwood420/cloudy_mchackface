import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { jsonResponse, mockApi, renderAt } from '../test/utils'

const EXPIRED = 'This reset link has expired or has already been used. Ask for a new one.'

describe('forgot password', () => {
  it('is linked from the login page', async () => {
    mockApi({})
    renderAt('/login')
    expect(screen.queryByText(/ask the app's owner/)).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('link', { name: 'Forgot your password?' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeInTheDocument()
  })

  it('sends the email and gives the same answer whatever happens next', async () => {
    let sent: unknown = null
    mockApi({
      'POST /api/auth/forgot-password': (init?: RequestInit) => {
        sent = JSON.parse(String(init?.body))
        return jsonResponse({ detail: 'ok' }, 202)
      },
    })
    renderAt('/forgot-password')
    await userEvent.type(await screen.findByLabelText('Email'), ' joel@example.com ')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(
      await screen.findByText(
        "If there's an account for that email, we've sent a link to reset your password. It expires in an hour. Check your spam folder if it doesn't arrive.",
      ),
    ).toBeInTheDocument()
    expect(sent).toEqual({ email: 'joel@example.com' })
    expect(screen.queryByRole('button', { name: 'Send reset link' })).not.toBeInTheDocument()
  })

  it('checks the email before sending', async () => {
    const fetchMock = mockApi({})
    renderAt('/forgot-password')
    await userEvent.click(await screen.findByRole('button', { name: 'Send reset link' }))
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalledWith('/api/auth/forgot-password', expect.anything())
  })

  it('shows the rate limit message', async () => {
    mockApi({ 'POST /api/auth/forgot-password': () => jsonResponse({ detail: 'Too many attempts. Wait a few minutes and try again.' }, 429) })
    renderAt('/forgot-password')
    await userEvent.type(await screen.findByLabelText('Email'), 'joel@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts. Wait a few minutes and try again.')
  })
})

describe('reset password', () => {
  it('sets the new password and sends them to log in', async () => {
    let sent: unknown = null
    mockApi({
      'POST /api/auth/reset-password': (init?: RequestInit) => {
        sent = JSON.parse(String(init?.body))
        return new Response(null, { status: 204 })
      },
    })
    renderAt('/reset-password#token=abc123')
    await userEvent.type(await screen.findByLabelText('New password'), 'brand new pw')
    await userEvent.click(screen.getByRole('button', { name: 'Set new password' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Password changed. Log in with your new password.')
    expect(sent).toEqual({ token: 'abc123', password: 'brand new pw' })
  })

  it('checks the password length before sending', async () => {
    mockApi({})
    renderAt('/reset-password#token=abc123')
    await userEvent.type(await screen.findByLabelText('New password'), 'short')
    await userEvent.click(screen.getByRole('button', { name: 'Set new password' }))
    expect(screen.getByText('Use a password of at least 8 characters.')).toBeInTheDocument()
  })

  it('offers a new link when the server says it expired', async () => {
    mockApi({ 'POST /api/auth/reset-password': () => jsonResponse({ detail: EXPIRED }, 400) })
    renderAt('/reset-password#token=old')
    await userEvent.type(await screen.findByLabelText('New password'), 'brand new pw')
    await userEvent.click(screen.getByRole('button', { name: 'Set new password' }))
    expect(await screen.findByText(EXPIRED)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Get a new link' })).toHaveAttribute('href', '/forgot-password')
  })

  it('without a token, says the link is broken instead of showing a form', async () => {
    mockApi({})
    renderAt('/reset-password')
    expect(await screen.findByText(EXPIRED)).toBeInTheDocument()
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Get a new link' })).toHaveAttribute('href', '/forgot-password')
  })
})
