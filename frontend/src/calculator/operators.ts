// Operator ids match the backend's identifiers and endpoint names.
export type Operator = 'add' | 'subtract' | 'multiply' | 'divide' | 'power'

export interface OperatorInfo {
  /** Symbol shown on the button and in the display. */
  symbol: string
  /** Accessible name of the operator's button, e.g. "multiply". */
  buttonLabel: string
  /** Name read out by screen readers, phrased to fit between operands ("12 times 2"). */
  spokenName: string
  /** Keyboard keys (KeyboardEvent.key values) that enter this operator. */
  keys: readonly string[]
}

export const OPERATORS: Readonly<Record<Operator, OperatorInfo>> = {
  add: { symbol: '+', buttonLabel: 'plus', spokenName: 'plus', keys: ['+'] },
  subtract: { symbol: '-', buttonLabel: 'minus', spokenName: 'minus', keys: ['-'] },
  multiply: { symbol: 'x', buttonLabel: 'multiply', spokenName: 'times', keys: ['*', 'x', 'X'] },
  divide: { symbol: '÷', buttonLabel: 'divide', spokenName: 'divided by', keys: ['/'] },
  power: { symbol: '^', buttonLabel: 'power', spokenName: 'to the power of', keys: ['^'] },
}

export const OPERATOR_IDS = Object.keys(OPERATORS) as Operator[]

export function isOperator(value: unknown): value is Operator {
  return typeof value === 'string' && Object.hasOwn(OPERATORS, value)
}

/** Returns the operator entered by a keyboard key, if any. */
export function operatorFromKey(key: string): Operator | null {
  return OPERATOR_IDS.find((op) => OPERATORS[op].keys.includes(key)) ?? null
}
