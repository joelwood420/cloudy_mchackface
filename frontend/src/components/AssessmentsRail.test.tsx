import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AssessmentsRail } from './AssessmentsRail'

const list = [
  { key: 'a3', title: 'Assessment 3', due_date: '2026-10-25', uplearn_url: 'https://up.test/a3', submitted: false, status: 'upcoming' as const, days_until: 8, module_code: 'CCC602' },
  { key: 'a1', title: 'Assessment 1', due_date: '2026-08-16', uplearn_url: null, submitted: true, status: 'submitted' as const, days_until: -62, module_code: 'CCC601' },
  { key: 'a4', title: 'Assessment 4', due_date: null, uplearn_url: null, submitted: false, status: 'no_date' as const, days_until: null, module_code: 'CCC602' },
]

const card = (title: string) => screen.getByRole('heading', { name: title }).closest('li')!
const noop = () => {}

describe('AssessmentsRail', () => {
  it('shows each assessment with its module, due date and status chip', () => {
    render(<AssessmentsRail assessments={list} portalUrl={null} onToggleSubmitted={noop} />)
    const a3 = card('Assessment 3')
    expect(within(a3).getByText('CCC602')).toBeInTheDocument()
    expect(within(a3).getByText('Due Sun, 25 Oct 2026', { exact: false })).toBeInTheDocument()
    expect(within(a3).getByText('Due in 8 days')).toBeInTheDocument()
    expect(within(card('Assessment 1')).getByText('Submitted')).toBeInTheDocument()
    expect(card('Assessment 4')).toHaveTextContent('Due date: see programme guide')
    expect(card('Assessment 4').querySelector('.status-chip')).toBeNull()
  })

  it('ticks submitted', async () => {
    const onToggle = vi.fn()
    render(<AssessmentsRail assessments={list} portalUrl={null} onToggleSubmitted={onToggle} />)
    await userEvent.click(within(card('Assessment 3')).getByRole('checkbox', { name: 'Mark submitted' }))
    expect(onToggle).toHaveBeenCalledWith('a3', true)
  })

  it('uses the code when an assessment has no module code', () => {
    render(<AssessmentsRail code="CCC609" assessments={[{ ...list[0], module_code: undefined }]} portalUrl={null} onToggleSubmitted={noop} />)
    expect(within(card('Assessment 3')).getByText('CCC609')).toBeInTheDocument()
  })

  it('shows the empty text', () => {
    render(<AssessmentsRail assessments={[]} portalUrl={null} onToggleSubmitted={noop} emptyText="No deadlines in the next 4 weeks." />)
    expect(screen.getByText('No deadlines in the next 4 weeks.')).toBeInTheDocument()
  })

  it('links each assessment to UPLearn when it has a link', () => {
    render(<AssessmentsRail assessments={list} portalUrl={null} onToggleSubmitted={noop} />)
    const link = within(card('Assessment 3')).getByRole('link', { name: 'Assessment 3 on UPLearn (opens in new tab)' })
    expect(link).toHaveAttribute('href', 'https://up.test/a3')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(card('Assessment 4')).queryByRole('link')).toBeNull()
  })

  it('shows the portal button only when the module has a portal link', () => {
    const { rerender } = render(<AssessmentsRail code="CCC602" assessments={[]} portalUrl="https://up.test/602" onToggleSubmitted={noop} />)
    const portal = screen.getByRole('link', { name: /course page on UPLearn \(opens in new tab\)$/ })
    expect(portal).toHaveAttribute('href', 'https://up.test/602')
    expect(portal).toHaveAttribute('target', '_blank')
    expect(screen.getByText('No assessments listed.')).toBeInTheDocument()

    rerender(<AssessmentsRail code="CCC602" assessments={[]} portalUrl={null} onToggleSubmitted={noop} />)
    expect(screen.queryByRole('link', { name: /course page on UPLearn/ })).toBeNull()
  })
})
