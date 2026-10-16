import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { fetchModules, updateSettings } from '../api'
import { ErrorMessage } from '../components/ErrorMessage'
import { useMe } from '../hooks/useMe'
import { weekOptions } from '../progress'
import { usePageTitle } from '../usePageTitle'

export function SettingsPage() {
  usePageTitle('Settings')
  const me = useMe()
  const modules = useQuery({ queryKey: ['modules'], queryFn: fetchModules })
  const queryClient = useQueryClient()
  const [choice, setChoice] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: (week: number | null) => updateSettings({ current_week: week }),
    onSuccess: (updated) => queryClient.setQueryData(['me'], updated),
  })

  if (modules.isPending || !me.data) {
    return (
      <main className="page">
        <p className="muted">Loading…</p>
      </main>
    )
  }
  if (modules.isError) {
    return (
      <main className="page">
        <ErrorMessage error={modules.error} onRetry={() => modules.refetch()} />
      </main>
    )
  }

  const value = choice ?? (me.data.current_week === null ? '' : String(me.data.current_week))
  function onSubmit(event: FormEvent) {
    event.preventDefault()
    save.mutate(value === '' ? null : Number(value))
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1>Settings</h1>
        <p className="muted">Pick the programme week you're working on. You can change it any time.</p>
      </header>
      <form className="card settings-card form" onSubmit={onSubmit}>
        <label className="field">
          <span>Current week</span>
          <select
            value={value}
            onChange={(e) => {
              setChoice(e.target.value)
              save.reset()
            }}
          >
            <option value="">Not set</option>
            {weekOptions(modules.data).map((o) => (
              <option key={o.week} value={o.week}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="settings-actions">
          <button type="submit" className="button-primary" disabled={save.isPending}>
            Save
          </button>
          <p role="status" className="small muted">
            {save.isSuccess ? 'Saved.' : ''}
          </p>
        </div>
        {save.isError && (
          <p role="alert" className="error">
            {save.error.message}
          </p>
        )}
      </form>
    </main>
  )
}
