import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { updateSettings } from '../api'
import { ErrorMessage } from '../components/ErrorMessage'
import { useIntakes } from '../hooks/useIntakes'
import { useMe } from '../hooks/useMe'
import { usePageTitle } from '../usePageTitle'

// Everything worked out from the intake: weeks, due dates and ticks.
const INTAKE_CACHES = ['this-week', 'modules', 'module', 'assessments'] as const

export function SettingsPage() {
  usePageTitle('Settings')
  const me = useMe()
  const intakes = useIntakes()
  const queryClient = useQueryClient()
  const [chosen, setChosen] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: updateSettings,
    onSuccess: (updated) => {
      queryClient.setQueryData(['me'], updated)
      INTAKE_CACHES.forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }))
    },
  })

  if (intakes.isError) return <main className="page"><ErrorMessage error={intakes.error} onRetry={() => intakes.refetch()} /></main>
  const current = me.data?.intake.key ?? ''
  const selected = chosen ?? current

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    save.mutate(selected)
  }

  return (
    <main className="page settings-page">
      <h1>Settings</h1>
      <form className="card form" onSubmit={onSubmit}>
        <label className="field">
          <span>Your intake</span>
          <select
            value={selected}
            onChange={(e) => {
              setChosen(e.target.value)
              save.reset()
            }}
            aria-describedby="settings-intake-hint"
            disabled={!intakes.data}
          >
            {intakes.data?.map((i) => (
              <option key={i.key} value={i.key}>
                {i.title}
              </option>
            ))}
          </select>
        </label>
        <p id="settings-intake-hint" className="muted small">
          Changing your intake moves you to that intake's weeks and due dates. Your ticks stay.
        </p>
        {save.isError && (
          <p role="alert" className="error">
            {save.error.message}
          </p>
        )}
        {save.isSuccess && (
          <p role="status">
            Saved. You're now on {save.data.intake.title}.
          </p>
        )}
        <button type="submit" className="button-primary" disabled={save.isPending || selected === current}>
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </form>
    </main>
  )
}
