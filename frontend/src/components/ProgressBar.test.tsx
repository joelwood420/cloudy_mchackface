import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('exposes an accessible, clamped, rounded value', () => {
    const { rerender } = render(<ProgressBar value={37.6} label="Module progress" />)
    const bar = screen.getByRole('progressbar', { name: 'Module progress' })
    expect(bar).toHaveAttribute('aria-valuenow', '38')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
    expect(bar.firstElementChild).toHaveStyle({ width: '38%' })

    rerender(<ProgressBar value={140} label="Module progress" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')

    rerender(<ProgressBar value={-5} label="Module progress" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('applies the size class', () => {
    render(<ProgressBar value={0} label="Week 9 progress" size="sm" />)
    expect(screen.getByRole('progressbar')).toHaveClass('progress', 'progress-sm')
  })
})
