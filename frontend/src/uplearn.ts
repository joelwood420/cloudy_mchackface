/** Short visible name for a UPLearn link, worked out from where it points in Moodle. */
export function uplearnLabel(url: string, trackCode?: string): string {
  let path: string
  try {
    path = new URL(url).pathname
  } catch {
    return 'UPLearn'
  }
  if (path.startsWith('/mod/assign/')) return 'Assignment'
  if (path.startsWith('/mod/forum/discuss.php')) return 'Forum post'
  if (path.startsWith('/mod/forum/')) return 'Forum'
  if (path.startsWith('/course/section.php')) return trackCode ? `${trackCode} tile` : 'Course tile'
  if (path.startsWith('/course/view.php')) return 'Course page'
  return 'UPLearn'
}

/** Accessible name for a UPLearn link: starts with its visible text, then says what it's for. */
export function uplearnName(text: string, subject: string): string {
  return text === 'UPLearn' ? `${subject} on UPLearn` : `${text} for ${subject} on UPLearn`
}

/** Accessible name for a track's own UPLearn link, e.g. "DP-203 tile on UPLearn". */
export function uplearnTrackName(url: string, trackCode: string): string {
  const text = uplearnLabel(url, trackCode)
  return text === 'UPLearn' ? `${trackCode} on UPLearn` : `${text} on UPLearn`
}
