import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { INTAKES, ME, THIS_WEEK, jsonResponse, mockApi, renderAt } from '../test/utils'

describe('IntakeGate', () => {
  it('asks an unconfirmed account for its intake, then lets them in', async () => {
    let confirmed = false
    mockApi({
      '/api/me': () => jsonResponse({ ...ME, intake_confirmed: confirmed }),
      '/api/intakes': INTAKES,
      '/api/modules': [],
      'PUT /api/me/settings': (init?: RequestInit) => {
        expect(JSON.parse(String(init?.body))).toEqual({ intake_key: '2607-online-ccc-pt' })
        confirmed = true
        return jsonResponse({ ...ME, study_mode: 'PT', intake: INTAKES[1], intake_confirmed: true })
      },
      '/api/this-week': THIS_WEEK,
    })
    renderAt('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Which intake are you on?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled()
    await userEvent.selectOptions(screen.getByLabelText('Your intake'), await screen.findByRole('option', { name: /part-time/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Week 11' })).toBeInTheDocument()
  })

  it('stays out of the way once the intake is confirmed', async () => {
    mockApi({ '/api/modules': [] })
    renderAt('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Week 11' })).toBeInTheDocument()
    expect(screen.queryByText('Which intake are you on?')).not.toBeInTheDocument()
  })
})
