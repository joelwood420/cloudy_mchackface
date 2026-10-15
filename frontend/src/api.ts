export type TaskType = 'learning_path' | 'lab' | 'assessment_step'

export interface ModuleSummary {
  key: string
  code: string
  title: string
  week_count: number
  task_count: number
}

export interface Task {
  key: string
  title: string
  type: TaskType
  external_url: string | null
  uplearn_url: string | null
}

export interface Week {
  key: string
  week_number: number
  title: string
  tasks: Task[]
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
