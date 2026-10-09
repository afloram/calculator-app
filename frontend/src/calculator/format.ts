/** Numbers at or above this magnitude are shown in scientific notation. */
export const SCIENTIFIC_ABOVE = 1e10
/** Non-zero numbers at or below this magnitude are shown in scientific notation. */
export const SCIENTIFIC_BELOW = 1e-10

/**
 * Formats a number from the backend (a canonical number string such as "24",
 * "0.3" or "3e+12") for display.
 *
 * - Scientific notation for |x| >= 1e10 and 0 < |x| <= 1e-10: "3e+12", "1.2345e-11".
 * - Plain decimal otherwise, never in exponent form: "0.0000001", "2.5".
 * - No trailing zeros, and -0 is shown as "0".
 *
 * JavaScript's own conversion can't be used as is: it switches to exponent
 * form at 1e21 and 1e-7 instead.
 */
export function formatNumber(value: string): string {
  const x = Number(value)
  if (!Number.isFinite(x)) {
    return value
  }
  if (x === 0) {
    return '0'
  }

  const abs = Math.abs(x)
  // toExponential() without arguments gives the shortest digits that
  // round-trip, with no trailing zeros, e.g. "1.2345e-11".
  const exponential = x.toExponential()
  if (abs >= SCIENTIFIC_ABOVE || abs <= SCIENTIFIC_BELOW) {
    return exponential
  }
  return toPlainDecimal(exponential)
}

/** Expands exponent notation ("-1.25e-7") into plain decimal ("-0.000000125"). */
function toPlainDecimal(exponential: string): string {
  const [mantissa, exponentText] = exponential.split('e')
  const exponent = Number(exponentText)
  const negative = mantissa.startsWith('-')
  const digits = mantissa.replace('-', '').replace('.', '')
  // Position of the decimal point within `digits`.
  const point = exponent + 1

  let plain: string
  if (point <= 0) {
    plain = `0.${'0'.repeat(-point)}${digits}`
  } else if (point >= digits.length) {
    plain = digits + '0'.repeat(point - digits.length)
  } else {
    plain = `${digits.slice(0, point)}.${digits.slice(point)}`
  }
  return negative ? `-${plain}` : plain
}
