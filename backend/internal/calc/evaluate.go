package calc

import "math"

// Evaluate applies op to a and b. The result is rounded to SignificantDigits
// and checked against the limits. Errors are always *Error values.
func Evaluate(op Operator, a, b float64) (float64, error) {
	if !op.Valid() {
		return 0, ErrUnknownOperator
	}
	if err := checkOperand(a); err != nil {
		return 0, err
	}
	if err := checkOperand(b); err != nil {
		return 0, err
	}

	var r float64
	// mustBeNonZero is set when the exact result can't be 0, so a 0 from the
	// float operation means it underflowed.
	var mustBeNonZero bool

	switch op {
	case Add:
		r = a + b
	case Subtract:
		r = a - b
	case Multiply:
		r = a * b
		mustBeNonZero = a != 0 && b != 0
	case Divide:
		if b == 0 {
			return 0, ErrDivisionByZero
		}
		r = a / b
		mustBeNonZero = a != 0
	case Power:
		if a == 0 && b < 0 {
			return 0, ErrZeroToNegativePower
		}
		if a < 0 && b != math.Trunc(b) {
			return 0, ErrComplexResult
		}
		r = math.Pow(a, b)
		mustBeNonZero = a != 0
	}

	if math.IsInf(r, 0) {
		return 0, ErrResultTooLarge
	}
	if r == 0 && mustBeNonZero {
		return 0, ErrResultTooSmall
	}
	r = roundSignificant(r)
	if err := checkResult(r); err != nil {
		return 0, err
	}
	return normalizeZero(r), nil
}
