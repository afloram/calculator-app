import { describe, expect, it } from 'vitest'
import { formatNumber } from './format'

describe('formatNumber', () => {
  it.each([
    // Plain numbers.
    ['0', '0'],
    ['-0', '0'],
    ['24', '24'],
    ['-24', '-24'],
    ['0.3', '0.3'],
    ['2.50', '2.5'],
    ['1234567', '1234567'],
    ['-123.456', '-123.456'],
    ['9999999999', '9999999999'],
    ['1234567890.12345', '1234567890.12345'],
    // Small numbers stay plain down to just above 1e-10, unlike Number#toString.
    ['0.000001', '0.000001'],
    ['1e-7', '0.0000001'],
    ['-1.25e-7', '-0.000000125'],
    ['1.5e-10', '0.00000000015'],
    ['0.000000000123456789012345', '0.000000000123456789012345'],
    // Big numbers switch to scientific notation at 1e10.
    ['10000000000', '1e+10'],
    ['-10000000000', '-1e+10'],
    ['3000000000000', '3e+12'],
    ['12345678901', '1.2345678901e+10'],
    ['1e+21', '1e+21'],
    ['1e+100', '1e+100'],
    // Small numbers switch at 1e-10 (inclusive).
    ['1e-10', '1e-10'],
    ['1.2345e-11', '1.2345e-11'],
    ['-4.5e-20', '-4.5e-20'],
    ['1e-100', '1e-100'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatNumber(input)).toBe(expected)
  })

  it('returns non-numeric input unchanged', () => {
    expect(formatNumber('abc')).toBe('abc')
  })
})
