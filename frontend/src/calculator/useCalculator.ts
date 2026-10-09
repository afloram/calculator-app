import { useCallback, useEffect, useReducer, useRef } from 'react'
import { ApiError, calculate } from '../api/client'
import { initialState, reducer } from './reducer'
import type { CalcState, Input } from './types'

/** How long an error message stays visible, unless dismissed by a key press. */
export const ERROR_TIMEOUT_MS = 3000

export interface UseCalculatorOptions {
  /** For tests. */
  calculateFn?: typeof calculate
  errorTimeoutMs?: number
}

export interface UseCalculator {
  state: CalcState
  /** Handles a key press from the keypad or the keyboard. */
  press: (input: Input) => void
}

/** Runs the calculator: input state machine, backend evaluation and error timeout. */
export function useCalculator({
  calculateFn = calculate,
  errorTimeoutMs = ERROR_TIMEOUT_MS,
}: UseCalculatorOptions = {}): UseCalculator {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Kept in a ref so passing a new function doesn't cancel a request in flight.
  const calculateRef = useRef(calculateFn)
  useEffect(() => {
    calculateRef.current = calculateFn
  }, [calculateFn])

  // Evaluate pending operations. The request is aborted if the pending
  // evaluation goes away first (e.g. "clear" pressed) or on unmount.
  const { pending } = state
  useEffect(() => {
    if (!pending) {
      return
    }
    const controller = new AbortController()
    calculateRef
      .current(pending.operator, pending.left, pending.right, { signal: controller.signal })
      .then(
        (response) => {
          if (controller.signal.aborted) {
            return
          }
          if (response.ok) {
            dispatch({
              type: 'evaluationSucceeded',
              operation: response.operation,
              result: response.result,
            })
          } else {
            dispatch({ type: 'evaluationFailed', message: `Invalid: ${response.error.message}` })
          }
        },
        (error: unknown) => {
          if (controller.signal.aborted) {
            return
          }
          const message = error instanceof ApiError ? error.message : 'Something went wrong'
          dispatch({ type: 'evaluationFailed', message })
        },
      )
    return () => controller.abort()
  }, [pending])

  // Hide errors after a while. A new error restarts the timer.
  const { error } = state
  useEffect(() => {
    if (error === null) {
      return
    }
    const timer = setTimeout(() => dispatch({ type: 'dismissError' }), errorTimeoutMs)
    return () => clearTimeout(timer)
  }, [error, errorTimeoutMs])

  const press = useCallback((input: Input) => dispatch({ type: 'input', input }), [])

  return { state, press }
}
