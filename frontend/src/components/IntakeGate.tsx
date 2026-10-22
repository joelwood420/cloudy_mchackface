import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, type ReactNode, useState } from 'react'
import { type Me, updateSettings } from '../api'
import { useIntakes } from '../hooks/useIntakes'
import { BrandLockup } from './BrandMark'

// Everything worked out from the intake: weeks, due dates and ticks.
const INTAKE_CACHES = ['this-week', 'modules', 'module', 'assessments'] as const

/** Accounts made before students picked their intake are asked once which one they're on. */
export function IntakeGate({ me, children }: { me: Me; children: ReactNode }) {
  const intakes = useIntakes()
  const queryClient = useQueryClient()
  const [chosen, setChosen] = useState('')
  const confirm = useMutation({
    mutationFn: updateSettings,
    onSuccess: (updated) => {
      queryClient.setQueryData(['me'], updated)
      INTAKE_CACHES.forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }))
    },
  })

  if (me.intake_confirmed) return children

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (chosen) confirm.mutate(chosen)
  }

  return (
    <main className="gate">
      <form className="gate-card card form" onSubmit={onSubmit}>
        <BrandLockup />
        <h1>Which intake are you on?</h1>
        <p>
          You can now pick your intake, full-time or part-time. We'll start your ticks over and mark everything before
          this week on your intake as done.
        </p>
        <label className="field">
          <span>Your intake</span>
          <select required value={chosen} onChange={(e) => setChosen(e.target.value)}>
            <option value="" disabled>
              {intakes.isError ? "Couldn't load intakes. Reload to try again." : 'Choose your intake'}
            </option>
            {intakes.data?.map((i) => (
              <option key={i.key} value={i.key}>
                {i.title}
              </option>
            ))}
          </select>
        </label>
        {confirm.isError && (
          <p role="alert" className="error">
            {confirm.error.message}
          </p>
        )}
        <div className="gate-actions">
          <button type="submit" className="button-primary" disabled={!chosen || confirm.isPending}>
            {confirm.isPending ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </form>
    </main>
  )
}
