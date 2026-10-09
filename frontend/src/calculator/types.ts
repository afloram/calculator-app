import type { Operation } from '../api/client'
import type { Operator } from './operators'

/** Maximum number of digits a typed operand can have (sign and "." don't count). */
export const MAX_DIGITS = 15

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

/** A key press, from the keypad or the keyboard. */
export type Input =
  | { type: 'digit'; digit: Digit }
  | { type: 'decimal' }
  | { type: 'operator'; operator: Operator }
  | { type: 'equals' }
  | { type: 'delete' }
  | { type: 'clear' }

/** An operation waiting for the backend to evaluate it. */
export interface PendingEvaluation {
  left: string
  operator: Operator
  right: string
  /** Operator to continue with after the result (chaining), or null for "=". */
  next: Operator | null
}

export interface CalcState {
  /** First operand: typed text (e.g. "-12.", "" when empty) or a backend result. */
  left: string
  /** Whether `left` is a backend result rather than typed text. Results can't be edited. */
  leftIsResult: boolean
  operator: Operator | null
  /** Second operand as typed ("" when empty, "-" when only the sign is entered). */
  right: string
  /** The last evaluated operation, shown above the input. */
  previous: Operation | null
  /** Set while waiting for the backend. */
  pending: PendingEvaluation | null
  /** Error message currently shown, if any. */
  error: string | null
}

export type Action =
  | { type: 'input'; input: Input }
  | { type: 'evaluationSucceeded'; operation: Operation; result: string }
  | { type: 'evaluationFailed'; message: string }
  | { type: 'dismissError' }
