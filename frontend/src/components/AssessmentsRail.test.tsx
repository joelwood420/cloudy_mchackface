import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AssessmentsRail } from './AssessmentsRail'

const assessments = [
  { key: 'a3', title: 'Assessment 3', due_date: '2026-10-25', uplearn_url: 'https://up.test/a3' },
  { key: 'a5', title: 'Assessment 5', due_date: '2026-10-14', uplearn_url: null },
  { key: 'a4', title: 'Assessment 4', due_date: null, uplearn_url: null },
]
const today = new Date(2026, 9, 15, 9, 0)

const card = (title: string) => screen.getByText(title).closest('li')!

describe('AssessmentsRail', () => {
  it('shows due dates and countdowns', () => {
    render(<AssessmentsRail code="CCC602" assessments={assessments} portalUrl={null} today={today} />)
    const rail = screen.getByRole('complementary', { name: 'Assessments' })
    expect(within(rail).getAllByText('CCC602')).toHaveLength(3)

    expect(card('Assessment 3')).toHaveTextContent(/Due Sun, 25 Oct 2026/)
    expect(within(card('Assessment 3')).getByText('10 days')).not.toHaveClass('is-soon')
    expect(within(card('Assessment 5')).getByText('1 day overdue')).toHaveClass('countdown', 'is-overdue')
    expect(card('Assessment 4')).toHaveTextContent('Due date: see programme guide')
    expect(card('Assessment 4').querySelector('.countdown')).toBeNull()
  })

  it('links each assessment to UPLearn when it has a link', () => {
    render(<AssessmentsRail code="CCC602" assessments={assessments} portalUrl={null} today={today} />)
    const link = within(card('Assessment 3')).getByRole('link', { name: 'UPLearn' })
    expect(link).toHaveAttribute('href', 'https://up.test/a3')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(card('Assessment 4')).queryByRole('link')).toBeNull()
  })

  it('shows the portal button only when the module has a portal link', () => {
    const { rerender } = render(
      <AssessmentsRail code="CCC602" assessments={[]} portalUrl="https://up.test/602" today={today} />,
    )
    const portal = screen.getByRole('link', { name: 'Open in Yoobee portal' })
    expect(portal).toHaveAttribute('href', 'https://up.test/602')
    expect(portal).toHaveAttribute('target', '_blank')
    expect(screen.getByText('No assessments listed.')).toBeInTheDocument()

    rerender(<AssessmentsRail code="CCC602" assessments={[]} portalUrl={null} today={today} />)
    expect(screen.queryByRole('link', { name: 'Open in Yoobee portal' })).toBeNull()
  })
})
