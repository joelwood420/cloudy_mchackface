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

export interface Assessment {
  key: string
  title: string
  due_date: string | null
  uplearn_url: string | null
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

export interface Me {
  email: string
  current_week: number | null
  study_mode: 'FT' | 'PT'
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
    let message = `Request failed (${res.status})`
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
export const signup = (email: string, password: string) =>
  request<Me>('POST', '/auth/signup', { email, password, accepted_disclaimer_version: DISCLAIMER_VERSION })
export const login = (email: string, password: string) => request<Me>('POST', '/auth/login', { email, password })
export const logout = () => request<void>('POST', '/auth/logout')
export const updateSettings = (body: { current_week: number | null }) => request<Me>('PATCH', '/me/settings', body)
export const setTaskDone = (key: string, done: boolean) =>
  request<void>(done ? 'PUT' : 'DELETE', `/tasks/${encodeURIComponent(key)}/complete`)
export const setPrerequisiteDone = (key: string, done: boolean) =>
  request<void>(done ? 'PUT' : 'DELETE', `/prerequisites/${encodeURIComponent(key)}/complete`)
