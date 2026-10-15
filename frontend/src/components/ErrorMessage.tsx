export function ErrorMessage({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div role="alert" className="error">
      <p>{error.message}</p>
      <button type="button" className="button-secondary" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}
