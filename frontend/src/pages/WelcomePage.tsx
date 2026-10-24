import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { NightSky } from '../components/NightSky'
import { SpinLink } from '../components/SpinLink'
import { usePageTitle } from '../usePageTitle'

function Tick() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <path d="M2 6.5 5 9l5-6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Where logged-out visitors land: what the app does, then a choice between making an account and logging in. */
export function WelcomePage() {
  usePageTitle('Welcome')
  const location = useLocation()

  // Each part of the page snaps to the screen; only while this page is showing.
  useEffect(() => {
    document.documentElement.classList.add('lp-snap')
    return () => document.documentElement.classList.remove('lp-snap')
  }, [])

  const getStarted = (
    <SpinLink to="/signup" state={location.state} direction="forward" className="pixel-btn">
      Get started
    </SpinLink>
  )

  return (
    <main className="lp">
      <div className="lp-hero lp-part">
        <NightSky />
        <div className="lp-wrap lp-hero-grid">
          <div className="lp-hero-copy">
            <span className="lp-cloud">
              <BrandMark width={220} height={160} />
            </span>
            <h1>
              Know exactly what to do <em>this week.</em>
            </h1>
            <p className="lp-lede">
              UPLearn hides your week behind tiles, forums and calendars. Cloudy McHackface puts it on one page: the
              modules to cover, the labs to run, what's due, and how far through you are.
            </p>
            <div className="lp-actions">
              {getStarted}
              <SpinLink to="/login" state={location.state} direction="forward" className="lp-text-link">
                Already have an account? Log in
              </SpinLink>
            </div>
            <p className="lp-note">
              Free, for Yoobee's Level 6 Cloud Computing &amp; Cyber Security diploma. Built by a student on it; not an official
              Yoobee app.
            </p>
          </div>

          <div className="lp-preview" role="img" aria-label="Example of the This week page">
            <span className="lp-preview-label">This week</span>
            <div className="lp-pv-head">
              <span className="lp-pv-title">Week 9</span>
              <span className="lp-pv-meta">CCC602 · 20–24 Oct</span>
            </div>
            <div className="lp-pv-progress">
              <div className="lp-pv-row">
                <span>Data Engineering in the Public Cloud</span>
                <span className="mono">58%</span>
              </div>
              <div className="lp-bar">
                <span style={{ width: '58%' }} />
              </div>
            </div>
            <ul className="lp-tasks">
              <li className="lp-task is-done">
                <span className="lp-tick"><Tick /></span>
                <span className="lp-task-name">Explore core data concepts</span>
                <span className="lp-chip">Learn</span>
              </li>
              <li className="lp-task is-done">
                <span className="lp-tick"><Tick /></span>
                <span className="lp-task-name">Explore relational data in Azure</span>
                <span className="lp-chip">Learn</span>
              </li>
              <li className="lp-task">
                <span className="lp-tick" />
                <span className="lp-task-name">Provision Azure SQL Database</span>
                <span className="lp-chip is-lab">Lab</span>
              </li>
              <li className="lp-task">
                <span className="lp-tick" />
                <span className="lp-task-name">Explore non-relational data in Azure</span>
                <span className="lp-chip">Learn</span>
              </li>
            </ul>
            <div className="lp-due">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>
                <strong>Assessment 3</strong> due Friday
              </span>
              <span className="mono">3 DAYS</span>
            </div>
          </div>
        </div>
      </div>

      <section className="lp-section lp-part">
        <div className="lp-wrap">
          <div className="lp-section-head">
            <h2>Less clicking around. More actual study.</h2>
          </div>
          <div className="lp-compare">
            <div className="lp-compare-col is-before">
              <h3>In UPLearn</h3>
              <ul>
                <li>Find the right course tile, then the schedule forum</li>
                <li>Scroll to this week's post and decode it</li>
                <li>Open each Microsoft Learn or AWS link one by one</li>
                <li>Check the calendar to see what's due</li>
              </ul>
            </div>
            <div className="lp-compare-col is-after">
              <h3>In Cloudy McHackface</h3>
              <ul>
                <li>Open the app. This week is already there.</li>
                <li>Every module and lab links straight to where you do it</li>
                <li>Tick things off and watch the bars fill</li>
                <li>Due dates worked out for your intake</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section lp-part">
        <div className="lp-wrap">
          <div className="lp-section-head">
            <h2>Three things, done properly.</h2>
          </div>
          <div className="lp-features">
            <article className="lp-feature">
              <div className="lp-mini" aria-hidden="true">
                {[
                  ['CCC601', 100],
                  ['CCC602', 58],
                  ['CCC603', 0],
                ].map(([code, pct]) => (
                  <div className="lp-mini-row" key={code}>
                    <div>
                      <span className="mono">{code}</span>
                      <span className="mono">{pct}%</span>
                    </div>
                    <div className="lp-bar">
                      <span style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
                <div className="lp-mini-row">
                  <div>
                    <strong>Whole programme</strong>
                    <span className="mono">41%</span>
                  </div>
                  <div className="lp-bar">
                    <span style={{ width: '41%' }} />
                  </div>
                </div>
              </div>
              <h3>Progress you can see</h3>
              <p>A bar for every course and one for the whole diploma. Each tick moves it.</p>
            </article>
            <article className="lp-feature">
              <div className="lp-mini" aria-hidden="true">
                <div className="lp-assess">
                  <span>Assessment 2</span>
                  <span className="stamp stamp-sm">Submitted</span>
                </div>
                <div className="lp-assess">
                  <span>Assessment 3</span>
                  <span className="lp-chip is-soon">Due Fri</span>
                </div>
                <div className="lp-assess">
                  <span>Assessment 4</span>
                  <span className="lp-chip">Week 14</span>
                </div>
              </div>
              <h3>Deadlines that don't sneak up</h3>
              <p>Every assessment with its due date for your intake, and a stamp when it's in.</p>
            </article>
            <article className="lp-feature">
              <div className="lp-mini" aria-hidden="true">
                <span className="lp-res-title">Resources for A3 Task 5</span>
                <span className="lp-res-link">
                  <svg width="14" height="14" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" fill="currentColor" />
                  </svg>
                  Tutor recording
                </span>
                <span className="lp-res-link">
                  <svg width="14" height="14" viewBox="0 0 24 24">
                    <path d="m9 8-5 4 5 4M15 8l5 4-5 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Code and data
                </span>
                <span className="lp-res-link">
                  <svg width="14" height="14" viewBox="0 0 24 24">
                    <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  How to submit
                </span>
              </div>
              <h3>The right links, right there</h3>
              <p>Recordings, tools and submission pages for the task you're on, without the hunt.</p>
            </article>
          </div>
        </div>
      </section>

      <div className="lp-part">
        <section className="lp-section">
          <div className="lp-wrap">
            <div className="lp-section-head">
              <h2>Set up in about a minute.</h2>
            </div>
            <ol className="lp-steps">
              <li>
                <h3>Make an account</h3>
                <p>Just an email and a password. Nothing to do with your Yoobee login.</p>
              </li>
              <li>
                <h3>Pick your intake</h3>
                <p>Weeks you've already done get ticked for you, so you start where you really are.</p>
              </li>
              <li>
                <h3>Work through the week</h3>
                <p>Open This week, follow the links, tick things off. That's it.</p>
              </li>
            </ol>
          </div>
        </section>
        <section className="lp-section lp-cta-section">
          <div className="lp-wrap">
            <div className="lp-cta">
              <NightSky />
              <h2>Stop digging through UPLearn.</h2>
              <div className="lp-actions">
                {getStarted}
                <SpinLink to="/login" state={location.state} direction="forward" className="lp-text-link">
                  Log in
                </SpinLink>
              </div>
            </div>
          </div>
        </section>
        <footer className="lp-footer">
          <div className="lp-wrap">
            <p>
              Cloudy McHackface is a student-made study tracker. It isn't an official Yoobee Colleges app and isn't
              endorsed by Yoobee. It links to UPLearn, Microsoft Learn and AWS for the actual coursework, and never
              stores course handouts, briefs or your submissions.
            </p>
          </div>
        </footer>
      </div>
    </main>
  )
}
