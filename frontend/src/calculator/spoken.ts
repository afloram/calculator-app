import type { Operation } from '../api/client'
import { formatNumber } from './format'
import { OPERATORS } from './operators'
import type { CalcState } from './types'

// Screen-reader versions of the display text. Symbols like "x", "^", a lone
// "-" or "3e+12" are read out poorly, so they're spelled out:
// "12 x 2" -> "12 times 2", "-5" -> "negative 5", "3e+12" -> "3 times 10 to the power of 12".

/** Spoken form of an operand as typed: "-", "-5", "12." */
export function spokenTyped(text: string): string {
  let spoken = text
  let prefix = ''
  if (spoken.startsWith('-')) {
    prefix = 'negative '
    spoken = spoken.slice(1)
  }
  if (spoken.endsWith('.')) {
    spoken = `${spoken.slice(0, -1)} point`
  }
  return (prefix + spoken).trim()
}

/** Spoken form of a backend number, formatted as on screen. */
export function spokenNumber(value: string): string {
  const [mantissa, exponent] = formatNumber(value).split('e')
  const spoken = spokenTyped(mantissa)
  if (exponent === undefined) {
    return spoken
  }
  return `${spoken} times 10 to the power of ${spokenTyped(exponent.replace('+', ''))}`
}

/** Spoken form of the input line, e.g. "24 plus negative 5". */
export function spokenInput(state: CalcState): string {
  if (state.left === '') {
    return '0'
  }
  const parts = [state.leftIsResult ? spokenNumber(state.left) : spokenTyped(state.left)]
  if (state.operator) {
    parts.push(OPERATORS[state.operator].spokenName)
  }
  if (state.right !== '') {
    parts.push(spokenTyped(state.right))
  }
  return parts.join(' ')
}

/** Spoken form of an evaluated operation, e.g. "12 times 2 equals". */
export function spokenOperation({ left, operator, right }: Operation): string {
  return `${spokenNumber(left)} ${OPERATORS[operator].spokenName} ${spokenNumber(right)} equals`
}

/**
 * What a screen reader should announce for the current state. Right after an
 * evaluation it reads the operation and result ("12 times 2 equals 24"), plus
 * the new operator when chaining; otherwise it reads the input line.
 */
export function announcement(state: CalcState): string {
  if (state.previous && state.leftIsResult && state.right === '') {
    const result = `${spokenOperation(state.previous)} ${spokenNumber(state.left)}`
    return state.operator ? `${result}, ${spokenInput(state)}` : result
  }
  return spokenInput(state)
}
