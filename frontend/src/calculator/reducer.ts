import type { Operator } from './operators'
import { type Action, type CalcState, type Digit, type Input, MAX_DIGITS } from './types'

export const initialState: CalcState = {
  left: '',
  leftIsResult: false,
  operator: null,
  right: '',
  previous: null,
  pending: null,
  error: null,
}

/**
 * The calculator's input state machine. It's pure: when an operation has to
 * be evaluated it only records a `pending` evaluation, and the caller (see
 * useCalculator) asks the backend and dispatches the outcome.
 */
export function reducer(state: CalcState, action: Action): CalcState {
  switch (action.type) {
    case 'input':
      return handleInput(state, action.input)

    case 'evaluationSucceeded': {
      if (!state.pending) {
        return state
      }
      return {
        ...state,
        left: action.result,
        leftIsResult: true,
        operator: state.pending.next,
        right: '',
        previous: action.operation,
        pending: null,
      }
    }

    case 'evaluationFailed':
      if (!state.pending) {
        return state
      }
      // The input stays as it was; only the error is shown.
      return { ...state, pending: null, error: action.message }

    case 'dismissError':
      return state.error === null ? state : { ...state, error: null }
  }
}

function handleInput(state: CalcState, input: Input): CalcState {
  if (input.type === 'clear') {
    return initialState
  }
  // One request at a time: ignore everything but "clear" while waiting.
  if (state.pending) {
    return state
  }
  // Any key press dismisses the current error.
  const s = state.error === null ? state : { ...state, error: null }

  switch (input.type) {
    case 'digit':
      return inputDigit(s, input.digit)
    case 'decimal':
      return inputDecimal(s)
    case 'operator':
      return inputOperator(s, input.operator)
    case 'equals':
      return inputEquals(s)
    case 'delete':
      return inputDelete(s)
  }
}

/** A result is on display (after "=", or after deleting the operator that followed one). */
function showsResult(state: CalcState): boolean {
  return state.leftIsResult && state.operator === null
}

/** Starts a new expression whose first operand is `left`. */
function startOver(state: CalcState, left: string): CalcState {
  return { ...initialState, error: state.error, left }
}

/** Returns a copy of state with the operand currently being typed replaced. */
function withCurrentOperand(state: CalcState, text: string): CalcState {
  return state.operator ? { ...state, right: text } : { ...state, left: text }
}

function currentOperand(state: CalcState): string {
  return state.operator ? state.right : state.left
}

function inputDigit(state: CalcState, digit: Digit): CalcState {
  if (showsResult(state)) {
    return startOver(state, digit)
  }
  const operand = currentOperand(state)
  if (countDigits(operand) >= MAX_DIGITS) {
    return state
  }
  // A lone leading zero is replaced rather than extended: "0" -> "5", "-0" -> "-5".
  if (operand === '0' || operand === '-0') {
    return withCurrentOperand(state, operand.slice(0, -1) + digit)
  }
  return withCurrentOperand(state, operand + digit)
}

function inputDecimal(state: CalcState): CalcState {
  if (showsResult(state)) {
    return startOver(state, '0.')
  }
  const operand = currentOperand(state)
  if (operand.includes('.')) {
    return state
  }
  // With no digits yet, start from zero: "" -> "0.", "-" -> "-0.".
  const base = operand === '' || operand === '-' ? `${operand}0` : operand
  return withCurrentOperand(state, `${base}.`)
}

function inputOperator(state: CalcState, operator: Operator): CalcState {
  const { left, right } = state

  // Nothing entered yet: "-" starts a negative first operand.
  if (left === '' || left === '-') {
    return left === '' && operator === 'subtract' ? { ...state, left: '-' } : state
  }

  // First operand complete: set the operator.
  if (state.operator === null) {
    return { ...state, left: stripTrailingPoint(left), operator }
  }

  // Operator set, no second operand: "-" is the second operand's sign,
  // anything else replaces the operator.
  if (right === '') {
    return operator === 'subtract' ? { ...state, right: '-' } : { ...state, operator }
  }

  // Only the sign typed: another "-" is ignored, anything else replaces the
  // operator and drops the sign.
  if (right === '-') {
    return operator === 'subtract' ? state : { ...state, operator, right: '' }
  }

  // Full expression: evaluate it and continue with the new operator.
  return { ...state, pending: { left, operator: state.operator, right, next: operator } }
}

function inputEquals(state: CalcState): CalcState {
  const { left, operator, right, previous } = state
  if (operator && isComplete(right)) {
    return { ...state, pending: { left, operator, right, next: null } }
  }
  // "=" on a result repeats the last operation on it: 10 + 1 = 11, then = 12, = 13...
  if (showsResult(state) && previous) {
    return {
      ...state,
      pending: { left, operator: previous.operator, right: previous.right, next: null },
    }
  }
  return state
}

function inputDelete(state: CalcState): CalcState {
  if (showsResult(state)) {
    return state
  }
  if (state.operator) {
    return state.right === ''
      ? { ...state, operator: null }
      : { ...state, right: state.right.slice(0, -1) }
  }
  return { ...state, left: state.left.slice(0, -1) }
}

/** Whether an operand has at least one digit, so it can be evaluated. */
function isComplete(operand: string): boolean {
  return /\d/.test(operand)
}

function countDigits(operand: string): number {
  return operand.replace(/\D/g, '').length
}

function stripTrailingPoint(operand: string): string {
  return operand.endsWith('.') ? operand.slice(0, -1) : operand
}
