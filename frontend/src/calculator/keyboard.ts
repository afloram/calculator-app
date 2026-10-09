import { operatorFromKey } from './operators'
import type { Digit, Input } from './types'

/** Maps a KeyboardEvent.key value to a calculator input, or null if the key isn't used. */
export function inputFromKey(key: string): Input | null {
  if (/^[0-9]$/.test(key)) {
    return { type: 'digit', digit: key as Digit }
  }
  switch (key) {
    case '.':
    case ',':
      return { type: 'decimal' }
    case '=':
    case 'Enter':
      return { type: 'equals' }
    case 'Backspace':
    case 'Delete':
      return { type: 'delete' }
    case 'Escape':
      return { type: 'clear' }
  }
  const operator = operatorFromKey(key)
  return operator ? { type: 'operator', operator } : null
}
