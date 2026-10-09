import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, type CalculateResult, type calculate } from '../api/client'
import { inputText, previousText } from './display'
import type { Digit, Input } from './types'
import { useCalculator } from './useCalculator'

const digit = (d: Digit): Input => ({ type: 'digit', digit: d })
const multiply: Input = { type: 'operator', operator: 'multiply' }
const divide: Input = { type: 'operator', operator: 'divide' }
const equals: Input = { type: 'equals' }

/** A calculate() stub whose responses are resolved manually by the test. */
function deferredCalculate() {
  let resolve!: (result: CalculateResult) => void
  let reject!: (error: unknown) => void
  const fn = vi.fn<typeof calculate>(
    () =>
      new Promise((res, rej) => {
        resolve = res
        reject = rej
      }),
  )
  return { fn, resolve: (r: CalculateResult) => resolve(r), reject: (e: unknown) => reject(e) }
}

function setup(calculateFn: typeof calculate) {
  const hook = renderHook(() => useCalculator({ calculateFn, errorTimeoutMs: 3000 }))
  const press = (...inputs: Input[]) =>
    act(() => {
      for (const input of inputs) {
        hook.result.current.press(input)
      }
    })
  return { hook, press, state: () => hook.result.current.state }
}

describe('useCalculator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('asks the backend to evaluate and shows the result', async () => {
    const calc = deferredCalculate()
    const { press, state } = setup(calc.fn)

    press(digit('5'), multiply, digit('2'), equals)
    expect(calc.fn).toHaveBeenCalledWith('multiply', '5', '2', expect.objectContaining({ signal: expect.any(AbortSignal) }))

    await act(async () =>
      calc.resolve({ ok: true, operation: { operator: 'multiply', left: '5', right: '2' }, result: '10' }),
    )
    expect(inputText(state())).toBe('10')
    expect(previousText(state())).toBe('5 x 2 =')
  })

  it('shows invalid operations as "Invalid: <message>" and hides them after 3 seconds', async () => {
    const calc = deferredCalculate()
    const { press, state } = setup(calc.fn)

    press(digit('5'), divide, digit('0'), equals)
    await act(async () =>
      calc.resolve({
        ok: false,
        operation: { operator: 'divide', left: '5', right: '0' },
        error: { code: 'DIVISION_BY_ZERO', message: 'Division by 0' },
      }),
    )
    expect(state().error).toBe('Invalid: Division by 0')
    expect(inputText(state())).toBe('5 ÷ 0')

    act(() => vi.advanceTimersByTime(2999))
    expect(state().error).not.toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(state().error).toBeNull()
  })

  it('shows network errors as is', async () => {
    const calc = deferredCalculate()
    const { press, state } = setup(calc.fn)

    press(digit('1'), multiply, digit('2'), equals)
    await act(async () => calc.reject(new ApiError('Could not reach the server')))
    expect(state().error).toBe('Could not reach the server')
    expect(inputText(state())).toBe('1 x 2')
  })

  it('shows a generic message for unexpected errors', async () => {
    const calc = deferredCalculate()
    const { press, state } = setup(calc.fn)

    press(digit('1'), multiply, digit('2'), equals)
    await act(async () => calc.reject(new Error('boom')))
    expect(state().error).toBe('Something went wrong')
  })

  it('aborts the request and ignores its answer when cleared', async () => {
    const calc = deferredCalculate()
    const { press, state } = setup(calc.fn)

    press(digit('5'), multiply, digit('2'), equals)
    const signal = calc.fn.mock.calls[0][3]?.signal
    press({ type: 'clear' })
    expect(signal?.aborted).toBe(true)

    await act(async () =>
      calc.resolve({ ok: true, operation: { operator: 'multiply', left: '5', right: '2' }, result: '10' }),
    )
    expect(inputText(state())).toBe('0')
    expect(previousText(state())).toBeNull()
  })

  it('aborts the request on unmount', () => {
    const calc = deferredCalculate()
    const { hook, press } = setup(calc.fn)

    press(digit('5'), multiply, digit('2'), equals)
    hook.unmount()
    expect(calc.fn.mock.calls[0][3]?.signal?.aborted).toBe(true)
  })

  it('sends one request per evaluation', async () => {
    const calc = deferredCalculate()
    const { press } = setup(calc.fn)

    press(digit('5'), multiply, digit('2'), equals, equals, digit('3'))
    expect(calc.fn).toHaveBeenCalledOnce()
  })
})
