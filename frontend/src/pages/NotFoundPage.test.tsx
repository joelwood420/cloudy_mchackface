import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockApi, renderAt } from '../test/utils'

describe('NotFoundPage', () => {
  it('shows a not-found page with a link home for unknown paths', async () => {
    mockApi({ '/api/modules': [] })
    renderAt('/nope/nope')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Back to modules' })).toHaveAttribute('href', '/modules')
  })
})
