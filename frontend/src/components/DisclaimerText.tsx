import { CONTACT_EMAIL } from '../disclaimer'

export function DisclaimerText() {
  return (
    <>
      <ol className="disclaimer-list">
        <li>
          <strong>This isn't an official Yoobee app.</strong> A student built it. Yoobee Colleges didn't make, endorse or
          approve it.
        </li>
        <li>
          <strong>UPLearn is the source of truth.</strong> Dates, weeks and assessment details here may be wrong or out of
          date. Always check UPLearn and your tutors.
        </li>
        <li>
          <strong>It's a study tracker, not academic advice.</strong> You're still responsible for meeting your own
          deadlines and course requirements.
        </li>
        <li>
          <strong>Academic integrity.</strong> This app won't write or help with assessment answers. Don't upload or share
          assessment briefs, handouts or your submissions.
        </li>
        <li>
          <strong>Your data.</strong> The app stores your email and the tasks you tick off. It never asks for your UPLearn
          login or lab training keys.
        </li>
        <li>
          <strong>No warranty.</strong> The app is provided as-is. The creator isn't responsible for missed deadlines or
          mistakes in the content.
        </li>
      </ol>
      <p className="muted">
        Spotted a mistake? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </>
  )
}
