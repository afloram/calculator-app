import { describe, expect, it } from 'vitest'
import { initialState } from './reducer'
import { announcement, spokenInput, spokenNumber, spokenOperation, spokenTyped } from './spoken'
import type { CalcState } from './types'

const state = (overrides: Partial<CalcState>): CalcState => ({ ...initialState, ...overrides })

describe('spoken text', () => {
  it.each([
    ['12', '12'],
    ['-', 'negative'],
    ['-5', 'negative 5'],
    ['12.', '12 point'],
    ['-0.', 'negative 0 point'],
    ['0.25', '0.25'],
  ])('spells out typed operand %j as %j', (text, spoken) => {
    expect(spokenTyped(text)).toBe(spoken)
  })

  it.each([
    ['24', '24'],
    ['-3', 'negative 3'],
    ['3000000000000', '3 times 10 to the power of 12'],
    ['-1.5e-11', 'negative 1.5 times 10 to the power of negative 11'],
  ])('spells out backend number %j as %j', (value, spoken) => {
    expect(spokenNumber(value)).toBe(spoken)
  })

  it('spells out the input line', () => {
    expect(spokenInput(initialState)).toBe('0')
    expect(spokenInput(state({ left: '12', operator: 'multiply', right: '2' }))).toBe('12 times 2')
    expect(spokenInput(state({ left: '10', operator: 'add', right: '-' }))).toBe('10 plus negative')
    expect(spokenInput(state({ left: '2', operator: 'power', right: '0.' }))).toBe(
      '2 to the power of 0 point',
    )
    expect(spokenInput(state({ left: '1e+21', leftIsResult: true, operator: 'divide' }))).toBe(
      '1 times 10 to the power of 21 divided by',
    )
  })

  it('spells out an evaluated operation', () => {
    expect(spokenOperation({ operator: 'subtract', left: '10', right: '-5' })).toBe(
      '10 minus negative 5 equals',
    )
  })

  describe('announcement', () => {
    const previous = { operator: 'multiply' as const, left: '12', right: '2' }

    it('reads the input while typing', () => {
      expect(announcement(state({ left: '12', operator: 'multiply' }))).toBe('12 times')
    })

    it('reads the operation and result after "="', () => {
      expect(announcement(state({ left: '24', leftIsResult: true, previous }))).toBe(
        '12 times 2 equals 24',
      )
    })

    it('reads the result and the new operator when chaining', () => {
      expect(
        announcement(state({ left: '24', leftIsResult: true, operator: 'add', previous })),
      ).toBe('12 times 2 equals 24, 24 plus')
    })

    it('goes back to reading the input once the second operand is typed', () => {
      expect(
        announcement(state({ left: '24', leftIsResult: true, operator: 'add', right: '5', previous })),
      ).toBe('24 plus 5')
    })
  })
})
