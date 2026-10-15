import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderAt } from '../test/utils'

describe('NotFoundPage', () => {
  it('shows a not-found page with a link home for unknown paths', () => {
    renderAt('/nope/nope')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to modules' })).toHaveAttribute('href', '/')
  })
})
