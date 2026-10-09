import { describe, expect, it } from 'vitest'
import { inputText, previousText } from './display'
import { inputFromKey } from './keyboard'
import { initialState, reducer } from './reducer'
import { type CalcState, type Input } from './types'

/**
 * Types a sequence of keys. Each character is a key as the keyboard maps it
 * ("x" multiply, "/" divide, "=" equals), plus "<" for delete and "C" for clear.
 */
function type(keys: string, state: CalcState = initialState): CalcState {
  for (const key of keys) {
    const input: Input | null =
      key === '<' ? { type: 'delete' } : key === 'C' ? { type: 'clear' } : inputFromKey(key)
    if (!input) {
      throw new Error(`unknown key ${key}`)
    }
    state = reducer(state, { type: 'input', input })
  }
  return state
}

/** Simulates the backend answering the pending evaluation with `result`. */
function succeed(state: CalcState, result: string): CalcState {
  expect(state.pending).not.toBeNull()
  const { left, operator, right } = state.pending!
  return reducer(state, { type: 'evaluationSucceeded', operation: { left, operator, right }, result })
}

function fail(state: CalcState, message: string): CalcState {
  expect(state.pending).not.toBeNull()
  return reducer(state, { type: 'evaluationFailed', message })
}

describe('reducer', () => {
  describe('typing operands', () => {
    it('shows 0 when nothing is entered', () => {
      expect(inputText(initialState)).toBe('0')
    })

    it('shows the expression as it is typed', () => {
      expect(inputText(type('12'))).toBe('12')
      expect(inputText(type('12x'))).toBe('12 x')
      expect(inputText(type('12x2'))).toBe('12 x 2')
    })

    it('replaces a lone leading zero', () => {
      expect(inputText(type('05'))).toBe('5')
      expect(inputText(type('00'))).toBe('0')
      expect(inputText(type('-05'))).toBe('-5')
      expect(inputText(type('1+05'))).toBe('1 + 5')
    })

    it('keeps zeros after other digits and after the decimal point', () => {
      expect(inputText(type('100'))).toBe('100')
      expect(inputText(type('0.05'))).toBe('0.05')
    })

    it('ignores digits past the 15-digit cap', () => {
      expect(inputText(type('1234567890123456'))).toBe('123456789012345')
      expect(inputText(type('-1.234567890123456'))).toBe('-1.23456789012345')
      expect(inputText(type('1+1234567890123456'))).toBe('1 + 123456789012345')
    })
  })

  describe('decimal point', () => {
    it('starts from 0 when the operand is empty', () => {
      expect(inputText(type('.'))).toBe('0.')
      expect(inputText(type('.5'))).toBe('0.5')
      expect(inputText(type('5+.'))).toBe('5 + 0.')
    })

    it('starts from 0 after a sign', () => {
      expect(inputText(type('-.'))).toBe('-0.')
      expect(inputText(type('5+-.'))).toBe('5 + -0.')
    })

    it('ignores a second decimal point', () => {
      expect(inputText(type('12.3.'))).toBe('12.3')
      expect(inputText(type('12..3'))).toBe('12.3')
    })

    it('drops a trailing point from the first operand when an operator is entered', () => {
      expect(inputText(type('5.+'))).toBe('5 +')
    })
  })

  describe('operators', () => {
    it('starts a negative first operand with "-"', () => {
      expect(inputText(type('-'))).toBe('-')
      expect(inputText(type('-5'))).toBe('-5')
    })

    it('ignores other operators when nothing is entered', () => {
      expect(type('+x/^')).toEqual(initialState)
    })

    it('ignores operators after a lone first-operand sign', () => {
      expect(inputText(type('--'))).toBe('-')
      expect(inputText(type('-+'))).toBe('-')
    })

    it('sets the operator after the first operand', () => {
      const state = type('5^')
      expect(state.operator).toBe('power')
      expect(inputText(state)).toBe('5 ^')
    })

    it('treats "-" after an operator as the sign of the second operand', () => {
      expect(inputText(type('10+-'))).toBe('10 + -')
      expect(inputText(type('10+-5'))).toBe('10 + -5')
      expect(inputText(type('10--5'))).toBe('10 - -5')
    })

    it('replaces the operator when another non-minus operator is entered', () => {
      expect(inputText(type('10+x'))).toBe('10 x')
      expect(inputText(type('10-/'))).toBe('10 ÷')
    })

    it('after a lone second-operand sign, ignores "-" and replaces the operator otherwise', () => {
      expect(inputText(type('10+--'))).toBe('10 + -')
      expect(inputText(type('10+-x'))).toBe('10 x')
    })

    it('evaluates a full expression and continues with the new operator', () => {
      let state = type('12x2+')
      expect(state.pending).toEqual({ left: '12', operator: 'multiply', right: '2', next: 'add' })
      expect(inputText(state)).toBe('12 x 2')

      state = succeed(state, '24')
      expect(inputText(state)).toBe('24 +')
      expect(previousText(state)).toBe('12 x 2 =')
      expect(state.pending).toBeNull()

      state = succeed(type('5=', state), '29')
      expect(inputText(state)).toBe('29')
      expect(previousText(state)).toBe('24 + 5 =')
    })

    it('evaluates instead of treating "-" as a sign when the expression is full', () => {
      const state = type('12x2-')
      expect(state.pending?.next).toBe('subtract')
    })
  })

  describe('equals', () => {
    it('evaluates a full expression and shows the result', () => {
      let state = type('5x2=')
      expect(state.pending).toEqual({ left: '5', operator: 'multiply', right: '2', next: null })

      state = succeed(state, '10')
      expect(inputText(state)).toBe('10')
      expect(previousText(state)).toBe('5 x 2 =')
      expect(state.operator).toBeNull()
    })

    it('sends operands as typed, including a trailing point', () => {
      expect(type('5+2.=').pending).toMatchObject({ left: '5', right: '2.' })
    })

    it.each(['', '5', '5+', '5+-', '-', '.'])('is ignored for the incomplete expression "%s"', (keys) => {
      const before = type(keys)
      expect(type('=', before)).toEqual(before)
    })

    it('repeats the last operator and second operand when pressed again on a result', () => {
      let state = succeed(type('10+1='), '11')

      state = type('=', state)
      expect(state.pending).toEqual({ left: '11', operator: 'add', right: '1', next: null })
      state = succeed(state, '12')
      expect(inputText(state)).toBe('12')
      expect(previousText(state)).toBe('11 + 1 =')

      state = succeed(type('=', state), '13')
      state = succeed(type('=', state), '14')
      expect(inputText(state)).toBe('14')
      expect(previousText(state)).toBe('13 + 1 =')
    })

    it('repeats with the canonical second operand from the backend', () => {
      // "2." was typed, but the backend reports it as "2".
      let state = type('5x2.=')
      state = reducer(state, {
        type: 'evaluationSucceeded',
        operation: { left: '5', operator: 'multiply', right: '2' },
        result: '10',
      })
      expect(type('=', state).pending).toEqual({ left: '10', operator: 'multiply', right: '2', next: null })
    })

    it('repeats after deleting the operator that followed a chained result', () => {
      // 12 x 2 + -> 24 +, delete -> 24 (result shown), = -> 24 x 2
      const state = type('<=', succeed(type('12x2+'), '24'))
      expect(state.pending).toEqual({ left: '24', operator: 'multiply', right: '2', next: null })
    })

    it('keeps the result when a repeat fails', () => {
      const result = succeed(type('5x10='), '50')
      const state = fail(type('=', result), 'Invalid: Result is too large')
      expect(inputText(state)).toBe('50')
      expect(previousText(state)).toBe('5 x 10 =')
      expect(state.error).toBe('Invalid: Result is too large')
    })

    it('does not repeat once the result is no longer shown', () => {
      const result = succeed(type('10+1='), '11')
      // An operator follows the result: the expression is incomplete.
      expect(type('+=', result).pending).toBeNull()
      // A new number was started, which clears the previous operation.
      expect(type('3=', result).pending).toBeNull()
      // Everything was cleared.
      expect(type('C=', result).pending).toBeNull()
    })

    it('formats results and operands in scientific notation', () => {
      let state = succeed(type('99999x99999='), '9999800001')
      expect(inputText(state)).toBe('9999800001')

      state = succeed(type('x10=', state), '99998000010')
      expect(inputText(state)).toBe('9.999800001e+10')
      expect(previousText(state)).toBe('9999800001 x 10 =')

      state = succeed(type('x2=', state), '199996000020')
      expect(previousText(state)).toBe('9.999800001e+10 x 2 =')
    })
  })

  describe('after a result', () => {
    const afterResult = () => succeed(type('5x2='), '10')

    it('starts a new expression when a digit is typed', () => {
      const state = type('3', afterResult())
      expect(inputText(state)).toBe('3')
      expect(state.leftIsResult).toBe(false)
      expect(previousText(state)).toBeNull()
    })

    it('starts a new expression from 0. when the decimal point is typed', () => {
      const state = type('.', afterResult())
      expect(inputText(state)).toBe('0.')
      expect(previousText(state)).toBeNull()
    })

    it('continues from the result when an operator is entered', () => {
      const state = type('+', afterResult())
      expect(inputText(state)).toBe('10 +')
      expect(previousText(state)).toBe('5 x 2 =')
    })

    it('continues from a negative result with "-" as an operator', () => {
      const state = type('-', succeed(type('2-5='), '-3'))
      expect(inputText(state)).toBe('-3 -')
    })

    it('ignores delete', () => {
      const before = afterResult()
      expect(type('<', before)).toBe(before)
    })
  })

  describe('delete', () => {
    it('removes the last character of the operand being typed', () => {
      expect(inputText(type('123<'))).toBe('12')
      expect(inputText(type('1.5<'))).toBe('1.')
      expect(inputText(type('1.5<<'))).toBe('1')
      expect(inputText(type('-5<'))).toBe('-')
      expect(inputText(type('-5<<'))).toBe('0')
      expect(inputText(type('5+-3<'))).toBe('5 + -')
      expect(inputText(type('5+-3<<'))).toBe('5 +')
    })

    it('removes the operator when there is no second operand', () => {
      const state = type('5+<')
      expect(inputText(state)).toBe('5')
      expect(state.operator).toBeNull()
    })

    it('does nothing when nothing is entered', () => {
      expect(type('<')).toEqual(initialState)
    })

    it('removes the operator after a chained result, then leaves the result alone', () => {
      let state = succeed(type('12x2+'), '24')
      state = type('<', state)
      expect(inputText(state)).toBe('24')
      expect(type('<', state)).toBe(state)
      // The result now behaves like one shown after "=".
      expect(inputText(type('7', state))).toBe('7')
    })
  })

  describe('clear', () => {
    it('resets everything, including the previous operation', () => {
      const state = type('C', type('3+', succeed(type('5x2='), '10')))
      expect(state).toEqual(initialState)
    })

    it('cancels a pending evaluation', () => {
      expect(type('5x2=C')).toEqual(initialState)
    })
  })

  describe('pending evaluation', () => {
    it('ignores input until the backend answers', () => {
      const pending = type('5x2=')
      expect(type('3+.<=', pending)).toBe(pending)
    })

    it('ignores outcomes when nothing is pending', () => {
      const state = type('5')
      expect(
        reducer(state, {
          type: 'evaluationSucceeded',
          operation: { left: '1', operator: 'add', right: '1' },
          result: '2',
        }),
      ).toBe(state)
      expect(reducer(state, { type: 'evaluationFailed', message: 'x' })).toBe(state)
    })
  })

  describe('errors', () => {
    it('shows the error and keeps the input as it was', () => {
      const before = type('5/0=')
      const state = fail(before, 'Invalid: Division by 0')
      expect(state.error).toBe('Invalid: Division by 0')
      expect(state.pending).toBeNull()
      expect(inputText(state)).toBe('5 ÷ 0')
      expect({ ...state, error: null }).toEqual({ ...before, pending: null })
    })

    it('keeps the input when a chained evaluation fails', () => {
      const state = fail(type('5/0+'), 'Invalid: Division by 0')
      expect(inputText(state)).toBe('5 ÷ 0')
      expect(state.operator).toBe('divide')
    })

    it('dismisses the error on the next key press, which is still applied', () => {
      const state = type('<', fail(type('5/0='), 'Invalid: Division by 0'))
      expect(state.error).toBeNull()
      expect(inputText(state)).toBe('5 ÷')
    })

    it('dismisses the error on request', () => {
      const state = reducer(fail(type('5/0='), 'Invalid: Division by 0'), { type: 'dismissError' })
      expect(state.error).toBeNull()
      expect(inputText(state)).toBe('5 ÷ 0')
    })
  })
})
