import { describe, expect, it } from 'vitest'
import { isOperator, OPERATOR_IDS, operatorFromKey } from './operators'

describe('operators', () => {
  it('lists the five backend operators', () => {
    expect(OPERATOR_IDS).toEqual(['add', 'subtract', 'multiply', 'divide', 'power'])
  })

  it.each([
    ['+', 'add'],
    ['-', 'subtract'],
    ['*', 'multiply'],
    ['x', 'multiply'],
    ['X', 'multiply'],
    ['/', 'divide'],
    ['^', 'power'],
  ])('maps key %s to %s', (key, op) => {
    expect(operatorFromKey(key)).toBe(op)
  })

  it('ignores keys that are not operators', () => {
    expect(operatorFromKey('5')).toBeNull()
    expect(operatorFromKey('Enter')).toBeNull()
  })

  it('validates operator ids', () => {
    expect(isOperator('divide')).toBe(true)
    expect(isOperator('modulo')).toBe(false)
    expect(isOperator('toString')).toBe(false)
    expect(isOperator(undefined)).toBe(false)
  })
})
