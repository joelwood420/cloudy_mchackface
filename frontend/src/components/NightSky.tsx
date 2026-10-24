// Fixed pixel stars, from a seeded random so they sit in the same place on every screen that shows the sky.
const STARS = (() => {
  let seed = 7
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  return Array.from({ length: 140 }, () => ({
    x: Math.round(rand() * 1600),
    y: Math.round(rand() * 900),
    size: rand() < 0.08 ? 3 : 2,
    warm: rand() < 0.15,
    opacity: 0.25 + rand() * 0.45,
  }))
})()

/** The starry night behind the landing page and the log in / sign up forms. Decorative. */
export function NightSky() {
  return (
    <svg className="lp-stars" aria-hidden="true" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      {STARS.map((s, i) => (
        <rect key={i} x={s.x} y={s.y} width={s.size} height={s.size} fill={s.warm ? '#f7c47e' : '#dbe4f0'} opacity={s.warm ? 0.7 : s.opacity} />
      ))}
    </svg>
  )
}
