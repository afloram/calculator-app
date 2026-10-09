import { describe, expect, it } from 'vitest'
import { inputFromKey } from './keyboard'

describe('inputFromKey', () => {
  it.each([
    ['0', { type: 'digit', digit: '0' }],
    ['7', { type: 'digit', digit: '7' }],
    ['.', { type: 'decimal' }],
    [',', { type: 'decimal' }],
    ['+', { type: 'operator', operator: 'add' }],
    ['-', { type: 'operator', operator: 'subtract' }],
    ['*', { type: 'operator', operator: 'multiply' }],
    ['x', { type: 'operator', operator: 'multiply' }],
    ['/', { type: 'operator', operator: 'divide' }],
    ['^', { type: 'operator', operator: 'power' }],
    ['=', { type: 'equals' }],
    ['Enter', { type: 'equals' }],
    ['Backspace', { type: 'delete' }],
    ['Delete', { type: 'delete' }],
    ['Escape', { type: 'clear' }],
  ])('maps %s', (key, expected) => {
    expect(inputFromKey(key)).toEqual(expected)
  })

  it.each(['a', 'Tab', ' ', 'Shift', 'F5', '12'])('ignores %j', (key) => {
    expect(inputFromKey(key)).toBeNull()
  })
})
