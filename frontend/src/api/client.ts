import { isOperator, type Operator } from '../calculator/operators'

/** An evaluated operation, with operands in the backend's canonical form. */
export interface Operation {
  operator: Operator
  left: string
  right: string
}

export interface CalculationError {
  /** Stable machine-readable code, e.g. "DIVISION_BY_ZERO". */
  code: string
  /** Human-readable message, e.g. "Division by 0". */
  message: string
}

export type CalculateResult =
  | { ok: true; operation: Operation; result: string }
  | { ok: false; operation: Operation | null; error: CalculationError }

/** Thrown when the backend can't be reached or answers with something unexpected. */
export class ApiError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'ApiError'
  }
}

export interface CalculateOptions {
  signal?: AbortSignal
  /** Overrides the API origin. Defaults to VITE_API_BASE_URL, or same-origin. */
  baseUrl?: string
  /** For tests. */
  fetchImpl?: typeof fetch
}

const DEFAULT_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * Asks the backend to evaluate `left <operator> right`.
 *
 * Resolves with `ok: false` when the operation is invalid (e.g. division by 0).
 * Rejects with ApiError on network failures or malformed responses.
 */
export async function calculate(
  operator: Operator,
  left: string,
  right: string,
  { signal, baseUrl = DEFAULT_BASE_URL, fetchImpl = fetch }: CalculateOptions = {},
): Promise<CalculateResult> {
  let response: Response
  try {
    response = await fetchImpl(`${baseUrl}/api/${operator}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ left, right }),
      signal,
    })
  } catch (cause) {
    if (signal?.aborted) {
      throw cause
    }
    throw new ApiError('Could not reach the server', { cause })
  }

  let body: unknown
  try {
    body = await response.json()
  } catch (cause) {
    throw new ApiError(`Unexpected response from the server (${response.status})`, { cause })
  }

  const result = parseCalculateResult(body)
  if (!result) {
    throw new ApiError(`Unexpected response from the server (${response.status})`)
  }
  return result
}

function parseCalculateResult(body: unknown): CalculateResult | null {
  if (!isRecord(body) || typeof body.ok !== 'boolean') {
    return null
  }
  const operation = parseOperation(body.operation)
  if (body.ok) {
    if (!operation || typeof body.result !== 'string') {
      return null
    }
    return { ok: true, operation, result: body.result }
  }
  const error = body.error
  if (!isRecord(error) || typeof error.code !== 'string' || typeof error.message !== 'string') {
    return null
  }
  return { ok: false, operation, error: { code: error.code, message: error.message } }
}

function parseOperation(value: unknown): Operation | null {
  if (
    !isRecord(value) ||
    !isOperator(value.operator) ||
    typeof value.left !== 'string' ||
    typeof value.right !== 'string'
  ) {
    return null
  }
  return { operator: value.operator, left: value.left, right: value.right }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
