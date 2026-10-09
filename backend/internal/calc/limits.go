package calc

import "math"

const (
	// MaxMagnitude is the largest absolute value accepted as an operand or
	// returned as a result (inclusive).
	MaxMagnitude = 1e100
	// MinMagnitude is the smallest non-zero absolute value accepted as an
	// operand or returned as a result (inclusive).
	MinMagnitude = 1e-100
	// SignificantDigits is the precision results are rounded to. It sits just
	// below float64's ~15.9 decimal digits, which hides binary artifacts such
	// as 0.1 + 0.2 = 0.30000000000000004.
	SignificantDigits = 15
)

// inRange reports whether x is zero or within [MinMagnitude, MaxMagnitude].
func inRange(x float64) bool {
	abs := math.Abs(x)
	return x == 0 || (abs >= MinMagnitude && abs <= MaxMagnitude)
}

// checkOperand validates a number used as an operand.
func checkOperand(x float64) error {
	if math.IsNaN(x) || math.IsInf(x, 0) {
		return ErrInvalidInput
	}
	if !inRange(x) {
		return ErrOperandOutOfRange
	}
	return nil
}

// checkResult validates an (already rounded) result.
func checkResult(x float64) error {
	switch {
	case math.IsNaN(x):
		return ErrComplexResult
	case math.Abs(x) > MaxMagnitude:
		return ErrResultTooLarge
	case !inRange(x):
		return ErrResultTooSmall
	}
	return nil
}
