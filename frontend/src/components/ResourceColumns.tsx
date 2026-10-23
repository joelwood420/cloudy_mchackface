import type { Resource, ResourceGroup } from '../api'
import { RESOURCE_GROUP_LABELS } from '../resources'
import { uplearnLabel } from '../uplearn'
import { ExternalLink } from './ExternalLink'

function taskLabel(tasks: number[]): string {
  return tasks.map((n) => `T${n}`).join(', ')
}

/** A resource's link. UPLearn links say what kind of page they open, like other UPLearn links in the app. */
function ResourceLink({ r }: { r: Resource }) {
  const kind = uplearnLabel(r.url)
  const onUplearn = r.url.startsWith('https://yoobee.uplearn.education/')
  return <ExternalLink href={r.url} label={onUplearn ? `${r.title}, ${kind.toLowerCase()} on UPLearn` : undefined}>{r.title}</ExternalLink>
}

/** One column per group that has resources, in the order given; each link with its task label. */
export function ResourceColumns({ resources, groups }: { resources: Resource[]; groups: ResourceGroup[] }) {
  const columns = groups.map((g) => ({ g, items: resources.filter((r) => r.group === g) })).filter((c) => c.items.length > 0)
  return (
    <div className="resource-columns">
      {columns.map(({ g, items }) => (
        <div key={g} className="resource-group">
          <h4>{RESOURCE_GROUP_LABELS[g]}</h4>
          <ul>
            {items.map((r) => (
              <li key={r.key}>
                <ResourceLink r={r} />
                {r.tasks.length > 0 && <span className="resource-tasks">{taskLabel(r.tasks)}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
