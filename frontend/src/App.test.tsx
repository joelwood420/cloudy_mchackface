import { describe, expect, it } from 'vitest'
import { ApiError } from './api'
import { shouldRetry } from './App'

describe('shouldRetry', () => {
  it('does not retry a 404', () => {
    expect(shouldRetry(0, new ApiError(404, 'Module not found'))).toBe(false)
  })

  it('does not retry a 422', () => {
    expect(shouldRetry(0, new ApiError(422, 'Unprocessable'))).toBe(false)
  })

  it('retries a 500 once', () => {
    expect(shouldRetry(0, new ApiError(500, 'Server exploded'))).toBe(true)
  })

  it('retries a network error once', () => {
    expect(shouldRetry(0, new TypeError('Failed to fetch'))).toBe(true)
  })

  it('stops retrying after one retry', () => {
    expect(shouldRetry(1, new ApiError(500, 'Server exploded'))).toBe(false)
    expect(shouldRetry(1, new TypeError('Failed to fetch'))).toBe(false)
  })

  it('does not retry a 401', () => {
    expect(shouldRetry(0, new ApiError(401, 'Not logged in'))).toBe(false)
  })

  it('retries a network error (status 0) once', () => {
    expect(shouldRetry(0, new ApiError(0, "Can't reach the server."))).toBe(true)
  })
})
