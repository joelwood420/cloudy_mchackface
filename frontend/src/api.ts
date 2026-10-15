export type TaskType = 'learning_path' | 'lab' | 'assessment_step'

export interface ModuleSummary {
  key: string
  code: string
  title: string
  submodule_count: number
  week_count: number
  task_count: number
  uplearn_url: string | null
}

export interface Task {
  key: string
  title: string
  type: TaskType
  external_url: string | null
  uplearn_url: string | null
  note: string | null
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

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`)
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (typeof body?.detail === 'string') message = body.detail
    } catch {
      // non-JSON error body; keep the generic message
    }
    throw new ApiError(res.status, message)
  }
  return (await res.json()) as T
}

export const fetchModules = () => getJson<ModuleSummary[]>('/modules')
export const fetchModule = (key: string) => getJson<ModuleDetail>(`/modules/${encodeURIComponent(key)}`)
