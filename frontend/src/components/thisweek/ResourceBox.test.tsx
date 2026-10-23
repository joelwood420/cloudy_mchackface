import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { ResourceBox as Box } from '../../api'
import { resourceBoxHeading } from '../../resources'
import { ResourceBox } from './ResourceBox'

const box: Box = {
  assessment_key: 'ccc602-a3',
  assessment_short: 'A3',
  task_numbers: [3, 4],
  resources: [
    { key: 'r34', title: '3.4 Data Factory', url: 'https://yoobee.uplearn.education/mod/forum/discuss.php?d=48939', group: 'recording', tasks: [3] },
    { key: 'repo', title: 'Tutor repo', url: 'https://github.com/yoobeecloud/x', group: 'code_data', tasks: [] },
    { key: 'adf', title: 'Data Factory docs', url: 'https://learn.microsoft.com/adf', group: 'tool', tasks: [3, 4] },
  ],
}

describe('resourceBoxHeading', () => {
  it('names the tasks in the slot', () => {
    expect(resourceBoxHeading('A3', [])).toBe('What you need for A3')
    expect(resourceBoxHeading('A3', [3])).toBe('What you need for A3 Task 3')
    expect(resourceBoxHeading('A3', [3, 4])).toBe('What you need for A3 Tasks 3 and 4')
    expect(resourceBoxHeading('A3', [2, 3, 4])).toBe('What you need for A3 Tasks 2, 3 and 4')
  })
})

describe('ResourceBox', () => {
  it('shows the slot resources in group columns with task labels and a link to all of them', () => {
    render(<MemoryRouter><ResourceBox box={box} /></MemoryRouter>)
    const region = screen.getByRole('region', { name: 'What you need for A3 Tasks 3 and 4' })
    expect(within(region).getByRole('heading', { name: 'Tutor recordings' })).toBeInTheDocument()
    expect(within(region).getByRole('heading', { name: 'Code and data' })).toBeInTheDocument()
    expect(within(region).getByRole('heading', { name: 'Tools' })).toBeInTheDocument()
    expect(within(region).queryByRole('heading', { name: 'Submitting' })).not.toBeInTheDocument()
    const rec = within(region).getByRole('link', { name: /3\.4 Data Factory/ })
    expect(rec).toHaveAttribute('href', box.resources[0].url)
    expect(rec).toHaveAttribute('target', '_blank')
    expect(rec.closest('li')).toHaveTextContent('T3')
    expect(within(region).getByRole('link', { name: /Data Factory docs/ }).closest('li')).toHaveTextContent('T3, T4')
    expect(within(region).getByRole('link', { name: 'All A3 resources →' })).toHaveAttribute('href', '/assessments#ccc602-a3')
  })
})
