import type { ResourceGroup } from './api'

export const RESOURCE_GROUP_LABELS: Record<ResourceGroup, string> = {
  recording: 'Tutor recordings',
  code_data: 'Code and data',
  tool: 'Tools',
  submitting: 'Submitting',
}

function list(numbers: number[]): string {
  return numbers.length === 1 ? `${numbers[0]}` : `${numbers.slice(0, -1).join(', ')} and ${numbers[numbers.length - 1]}`
}

/** "Resources for A3 Tasks 3 and 4"; just "Resources for A3" when no task numbers are in the slot. */
export function resourceBoxHeading(short: string, numbers: number[]): string {
  if (numbers.length === 0) return `Resources for ${short}`
  return `Resources for ${short} ${numbers.length === 1 ? 'Task' : 'Tasks'} ${list(numbers)}`
}
