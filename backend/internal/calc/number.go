package calc

import (
	"errors"
	"math"
	"regexp"
	"strconv"
	"strings"
)

// numberPattern accepts plain decimal numbers with an optional sign and
// exponent: "12", "-0.5", "5.", ".5", "3e+12", "1.5E-7". It deliberately
// rejects forms strconv.ParseFloat would otherwise accept, such as "Inf",
// "NaN", hex floats and underscores.
var numberPattern = regexp.MustCompile(`^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$`)

// ParseNumber parses an operand string and checks it against the limits.
func ParseNumber(s string) (float64, error) {
	if !numberPattern.MatchString(s) {
		return 0, ErrInvalidInput
	}
	x, err := strconv.ParseFloat(s, 64)
	if errors.Is(err, strconv.ErrRange) {
		return 0, ErrOperandOutOfRange
	}
	if err != nil {
		return 0, ErrInvalidInput
	}
	// ParseFloat silently underflows tiny values (e.g. "1e-400") to 0.
	if x == 0 && hasNonZeroDigit(s) {
		return 0, ErrOperandOutOfRange
	}
	if err := checkOperand(x); err != nil {
		return 0, err
	}
	return normalizeZero(x), nil
}

// hasNonZeroDigit reports whether the mantissa of a number string (the part
// before any exponent) contains a digit other than 0.
func hasNonZeroDigit(s string) bool {
	mantissa, _, _ := strings.Cut(strings.ToLower(s), "e")
	return strings.ContainsAny(mantissa, "123456789")
}

// FormatNumber returns the canonical string for x: the shortest representation
// that parses back to the same float64. Like JavaScript's Number#toString, it
// uses plain notation for 1e-6 <= |x| < 1e21 and exponent notation otherwise.
// This is a machine-readable format, not display text.
func FormatNumber(x float64) string {
	x = normalizeZero(x)
	abs := math.Abs(x)
	format := byte('f')
	if abs != 0 && (abs < 1e-6 || abs >= 1e21) {
		format = 'e'
	}
	s := strconv.FormatFloat(x, format, -1, 64)
	if format == 'e' {
		// Drop exponent zero-padding: "1e-07" -> "1e-7".
		if n := len(s); n >= 4 && s[n-4] == 'e' && s[n-2] == '0' {
			s = s[:n-2] + s[n-1:]
		}
	}
	return s
}

// roundSignificant rounds x to SignificantDigits significant digits.
func roundSignificant(x float64) float64 {
	if x == 0 || math.IsNaN(x) || math.IsInf(x, 0) {
		return x
	}
	r, _ := strconv.ParseFloat(strconv.FormatFloat(x, 'e', SignificantDigits-1, 64), 64)
	return r
}

// normalizeZero turns -0 into 0.
func normalizeZero(x float64) float64 {
	if x == 0 {
		return 0
	}
	return x
}
