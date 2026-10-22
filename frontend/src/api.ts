import { DISCLAIMER_VERSION } from './disclaimer'

export type TaskType = 'learning_path' | 'lab' | 'assessment_step'

export interface ModuleSummary {
  key: string
  code: string
  title: string
  submodule_count: number
  week_count: number
  task_count: number
  completed_count: number
  week_numbers: number[]
  uplearn_url: string | null
}

export interface Task {
  key: string
  title: string
  type: TaskType
  external_url: string | null
  uplearn_url: string | null
  note: string | null
  done: boolean
}

export interface Week {
  key: string
  submodule_key: string
  week_number: number
  title: string
  tasks: Task[]
  schedule_post_url: string | null
}

export interface Prerequisite {
  key: string
  title: string
  note: string | null
  external_url: string | null
  uplearn_url: string | null
  completed: boolean
}

export interface Submodule {
  key: string
  code: string
  title: string
  uplearn_url: string | null
  first_week: number | null
  last_week: number | null
  prerequisites: Prerequisite[]
}

export type AssessmentStatus = 'submitted' | 'due_today' | 'upcoming' | 'overdue' | 'no_date'

export interface Assessment {
  key: string
  title: string
  due_date: string | null
  uplearn_url: string | null
  submitted: boolean
  status: AssessmentStatus
  days_until: number | null
}

export interface AssessmentWithModule extends Assessment {
  module_key: string
  module_code: string
}

export interface ModuleDetail {
  key: string
  code: string
  title: string
  uplearn_url: string | null
  submodules: Submodule[]
  weeks: Week[]
  assessments: Assessment[]
}

export interface IntakeOption {
  key: string
  title: string
  study_mode: 'FT' | 'PT'
}

export interface Me {
  email: string
  study_mode: 'FT' | 'PT'
  intake: IntakeOption
}

export interface SignupResult extends Me {
  prefilled_through_week: number | null
}

export type WeekStatus = 'before_start' | 'teaching' | 'break' | 'finished'

export interface ThisWeekGroup {
  module_key: string
  module_code: string
  module_title: string
  module_uplearn_url: string | null
  submodule: { key: string; code: string; title: string; uplearn_url: string | null }
  week: Week
  prerequisites: Prerequisite[]
}

export interface LurkingTask extends Task {
  module_code: string
  submodule_code: string
  submodule_uplearn_url: string | null
  schedule_post_url: string | null
}

export interface ThisWeek {
  today: string
  status: WeekStatus
  week: { week_number: number; starts_on: string; ends_on: string } | null
  current_break: { starts_on: string; ends_on: string; week_of_break: number; length_weeks: number } | null
  next_week: { week_number: number; starts_on: string } | null
  upcoming_break: { starts_on: string; ends_on: string; length_weeks: number; resumes_week: number; resumes_on: string } | null
  holidays: { day: string; name: string }[]
  groups: ThisWeekGroup[]
  ahead: { week_number: number; groups: ThisWeekGroup[] } | null
  lurking: { week_number: number; tasks: LurkingTask[] }[]
  assessments: AssessmentWithModule[]
  stats: { done: number; total: number; next_deadline_days: number | null }
}

export class ApiError extends Error {
  /** HTTP status, or 0 when the server couldn't be reached. */
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const isUnauthorized = (error: unknown) => error instanceof ApiError && error.status === 401

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.")
  }
  if (!res.ok) {
    let message = `The server had a problem (error ${res.status}). Try again in a moment.`
    try {
      const data = await res.json()
      if (typeof data?.detail === 'string') message = data.detail
      else if (res.status === 422) message = 'Check the details you entered and try again.'
    } catch {
      // non-JSON error body; keep the generic message
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const fetchModules = () => request<ModuleSummary[]>('GET', '/modules')
export const fetchModule = (key: string) => request<ModuleDetail>('GET', `/modules/${encodeURIComponent(key)}`)
export const fetchMe = () => request<Me>('GET', '/me')
export const fetchThisWeek = () => request<ThisWeek>('GET', '/this-week')
export const fetchAssessments = () => request<AssessmentWithModule[]>('GET', '/assessments')
export const setAssessmentSubmitted = (key: string, submitted: boolean) =>
  request<void>(submitted ? 'PUT' : 'DELETE', `/assessments/${encodeURIComponent(key)}/submitted`)
export const fetchIntakes = () => request<IntakeOption[]>('GET', '/intakes')
export const updateSettings = (intakeKey: string) => request<Me>('PUT', '/me/settings', { intake_key: intakeKey })
export const signup = (email: string, password: string, intakeKey: string) =>
  request<SignupResult>('POST', '/auth/signup', {
    email,
    password,
    accepted_disclaimer_version: DISCLAIMER_VERSION,
    intake_key: intakeKey,
  })
export const login = (email: string, password: string) => request<Me>('POST', '/auth/login', { email, password })
export const logout = () => request<void>('POST', '/auth/logout')
export const setTaskDone = (key: string, done: boolean) =>
  request<void>(done ? 'PUT' : 'DELETE', `/tasks/${encodeURIComponent(key)}/complete`)
export const setPrerequisiteDone = (key: string, done: boolean) =>
  request<void>(done ? 'PUT' : 'DELETE', `/prerequisites/${encodeURIComponent(key)}/complete`)
