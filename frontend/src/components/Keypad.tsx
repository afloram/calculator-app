import { type Operator, OPERATORS } from '../calculator/operators'
import type { Digit, Input } from '../calculator/types'

type KeyVariant = 'digit' | 'operator' | 'function' | 'equals'

interface KeyDef {
  label: string
  /** Accessible name, when the visible label isn't clear enough to be read out. */
  ariaLabel?: string
  input: Input
  variant: KeyVariant
  wide?: boolean
}

const digit = (d: Digit): KeyDef => ({ label: d, input: { type: 'digit', digit: d }, variant: 'digit' })

const operator = (op: Operator): KeyDef => ({
  label: OPERATORS[op].symbol,
  ariaLabel: OPERATORS[op].buttonLabel,
  input: { type: 'operator', operator: op },
  variant: 'operator',
})

/** Keys in reading order, laid out on a 4-column grid. */
const KEYS: KeyDef[] = [
  { label: 'AC', ariaLabel: 'clear', input: { type: 'clear' }, variant: 'function' },
  { label: '⌫', ariaLabel: 'delete', input: { type: 'delete' }, variant: 'function' },
  operator('power'),
  operator('divide'),
  digit('7'),
  digit('8'),
  digit('9'),
  operator('multiply'),
  digit('4'),
  digit('5'),
  digit('6'),
  operator('subtract'),
  digit('1'),
  digit('2'),
  digit('3'),
  operator('add'),
  { ...digit('0'), wide: true },
  { label: '.', ariaLabel: 'decimal point', input: { type: 'decimal' }, variant: 'digit' },
  { label: '=', ariaLabel: 'equals', input: { type: 'equals' }, variant: 'equals' },
]

interface KeypadProps {
  onPress: (input: Input) => void
}

export function Keypad({ onPress }: KeypadProps) {
  return (
    <div className="keypad">
      {KEYS.map((key) => (
        <button
          key={key.label}
          type="button"
          className={`key key--${key.variant}${key.wide ? ' key--wide' : ''}`}
          aria-label={key.ariaLabel}
          onClick={() => onPress(key.input)}
        >
          {key.label}
        </button>
      ))}
    </div>
  )
}
