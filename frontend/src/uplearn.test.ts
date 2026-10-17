import { describe, expect, it } from 'vitest'
import { uplearnLabel } from './uplearn'

const up = (path: string) => `https://yoobee.uplearn.education${path}`

describe('uplearnLabel', () => {
  it('names a link by where it points in UPLearn', () => {
    expect(uplearnLabel(up('/mod/assign/view.php?id=73319'))).toBe('Assignment')
    expect(uplearnLabel(up('/mod/forum/discuss.php?d=1'))).toBe('Forum post')
    expect(uplearnLabel(up('/mod/forum/view.php?id=51304'))).toBe('Forum')
    expect(uplearnLabel(up('/course/section.php?id=9657'), 'DP-203')).toBe('DP-203 tile')
    expect(uplearnLabel(up('/course/section.php?id=9657'))).toBe('Course tile')
    expect(uplearnLabel(up('/course/view.php?id=548'))).toBe('Course page')
  })

  it('falls back to UPLearn for anything else', () => {
    expect(uplearnLabel(up('/'))).toBe('UPLearn')
    expect(uplearnLabel('not a url')).toBe('UPLearn')
  })
})
