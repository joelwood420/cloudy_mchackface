import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { DISCLAIMER_VERSION } from '../disclaimer'
import { mockApi, renderAt } from '../test/utils'

describe('DisclaimerGate', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi({ '/api/modules': [] })
  })

  it('shows the disclaimer instead of the app until accepted', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Before you start' })).toBeInTheDocument()
    expect(screen.getByText(/This isn't an official Yoobee app/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'joeldevwood@gmail.com' })).toHaveAttribute('href', 'mailto:joeldevwood@gmail.com')
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
  })

  it('gates every route, not just the home page', () => {
    renderAt('/modules/ccc601')
    expect(screen.getByRole('heading', { name: 'Before you start' })).toBeInTheDocument()
  })

  it('opens the app and remembers acceptance', async () => {
    renderAt('/')
    await userEvent.click(screen.getByRole('button', { name: 'I understand and accept' }))
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(localStorage.getItem('disclaimer-accepted-version')).toBe(String(DISCLAIMER_VERSION))
  })

  it('asks again when the disclaimer version changes', () => {
    localStorage.setItem('disclaimer-accepted-version', String(DISCLAIMER_VERSION - 1))
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Before you start' })).toBeInTheDocument()
  })

  it('offers UPLearn instead of a dead end', () => {
    renderAt('/')
    expect(screen.getByRole('link', { name: 'Go to UPLearn instead' })).toHaveAttribute('href', 'https://yoobee.uplearn.education/')
  })
})

describe('DisclaimerPage', () => {
  it('can be re-read from the sidebar after accepting', async () => {
    mockApi({ '/api/modules': [] })
    renderAt('/')
    await userEvent.click(await screen.findByRole('link', { name: 'Disclaimer' }))
    expect(screen.getByRole('heading', { name: 'Disclaimer' })).toBeInTheDocument()
    expect(screen.getByText(/UPLearn is the source of truth/)).toBeInTheDocument()
  })
})
