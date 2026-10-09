import type { Operation } from '../api/client'
import { formatNumber } from './format'
import { OPERATORS } from './operators'
import type { CalcState } from './types'

/**
 * Text for the main input line, e.g. "12 x 2", "10 + -", "3e+12".
 * Results are formatted; operands being typed are shown exactly as typed.
 * Shows "0" when nothing has been entered.
 */
export function inputText(state: CalcState): string {
  if (state.left === '') {
    return '0'
  }
  const parts = [state.leftIsResult ? formatNumber(state.left) : state.left]
  if (state.operator) {
    parts.push(OPERATORS[state.operator].symbol)
  }
  if (state.right !== '') {
    parts.push(state.right)
  }
  return parts.join(' ')
}

/** Text for the previous-operation line, e.g. "12 x 2 =", or null if there isn't one. */
export function previousText(state: CalcState): string | null {
  return state.previous ? operationText(state.previous) : null
}

export function operationText({ left, operator, right }: Operation): string {
  return `${formatNumber(left)} ${OPERATORS[operator].symbol} ${formatNumber(right)} =`
}
