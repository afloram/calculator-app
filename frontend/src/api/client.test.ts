import { describe, expect, it, vi } from 'vitest'
import { ApiError, calculate } from './client'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockFetch(response: Response) {
  return vi.fn<typeof fetch>(() => Promise.resolve(response))
}

function failingFetch(error: unknown) {
  return vi.fn<typeof fetch>(() => Promise.reject(error))
}

describe('calculate', () => {
  it('posts the operands to the operator endpoint', async () => {
    const fetchImpl = mockFetch(
      jsonResponse(200, {
        ok: true,
        operation: { operator: 'multiply', left: '12', right: '2' },
        result: '24',
        error: null,
      }),
    )

    await calculate('multiply', '12', '2', { fetchImpl, baseUrl: 'http://api.test' })

    expect(fetchImpl).toHaveBeenCalledOnce()
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('http://api.test/api/multiply')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual({ left: '12', right: '2' })
  })

  it('returns the result of a successful operation', async () => {
    const fetchImpl = mockFetch(
      jsonResponse(200, {
        ok: true,
        operation: { operator: 'multiply', left: '12', right: '2' },
        result: '24',
        error: null,
      }),
    )

    await expect(calculate('multiply', '12', '2', { fetchImpl })).resolves.toEqual({
      ok: true,
      operation: { operator: 'multiply', left: '12', right: '2' },
      result: '24',
    })
  })

  it('returns invalid operations as ok: false', async () => {
    const fetchImpl = mockFetch(
      jsonResponse(422, {
        ok: false,
        operation: { operator: 'divide', left: '5', right: '0' },
        result: null,
        error: { code: 'DIVISION_BY_ZERO', message: 'Division by 0' },
      }),
    )

    await expect(calculate('divide', '5', '0', { fetchImpl })).resolves.toEqual({
      ok: false,
      operation: { operator: 'divide', left: '5', right: '0' },
      error: { code: 'DIVISION_BY_ZERO', message: 'Division by 0' },
    })
  })

  it('returns bad requests as ok: false with a null operation', async () => {
    const fetchImpl = mockFetch(
      jsonResponse(400, {
        ok: false,
        operation: null,
        result: null,
        error: { code: 'INVALID_INPUT', message: 'Invalid number' },
      }),
    )

    await expect(calculate('add', 'abc', '2', { fetchImpl })).resolves.toEqual({
      ok: false,
      operation: null,
      error: { code: 'INVALID_INPUT', message: 'Invalid number' },
    })
  })

  it('throws ApiError when the server is unreachable', async () => {
    const fetchImpl = failingFetch(new TypeError('Failed to fetch'))

    await expect(calculate('add', '1', '2', { fetchImpl })).rejects.toThrow(
      new ApiError('Could not reach the server'),
    )
  })

  it('throws ApiError on a non-JSON response', async () => {
    const fetchImpl = mockFetch(new Response('Bad Gateway', { status: 502 }))

    await expect(calculate('add', '1', '2', { fetchImpl })).rejects.toBeInstanceOf(ApiError)
  })

  it.each([
    ['missing ok', { result: '3' }],
    ['ok without result', { ok: true, operation: { operator: 'add', left: '1', right: '2' } }],
    ['unknown operator', { ok: true, operation: { operator: 'mod', left: '1', right: '2' }, result: '3' }],
    ['failure without error', { ok: false, operation: null }],
  ])('throws ApiError on a malformed response (%s)', async (_, body) => {
    const fetchImpl = mockFetch(jsonResponse(200, body))

    await expect(calculate('add', '1', '2', { fetchImpl })).rejects.toBeInstanceOf(ApiError)
  })

  it('rethrows aborts as is', async () => {
    const controller = new AbortController()
    controller.abort()
    const abortError = new DOMException('Aborted', 'AbortError')
    const fetchImpl = failingFetch(abortError)

    await expect(
      calculate('add', '1', '2', { fetchImpl, signal: controller.signal }),
    ).rejects.toBe(abortError)
  })
})
