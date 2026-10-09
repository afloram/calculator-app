package calc

import (
	"errors"
	"math"
	"testing"
)

func TestEvaluate(t *testing.T) {
	tests := []struct {
		name    string
		op      Operator
		a, b    float64
		want    float64
		wantErr error
	}{
		// Basic operations.
		{"add", Add, 5, 2, 7, nil},
		{"subtract", Subtract, 5, 2, 3, nil},
		{"subtract to negative", Subtract, 2, 5, -3, nil},
		{"multiply", Multiply, 12, 2, 24, nil},
		{"divide", Divide, 10, 4, 2.5, nil},
		{"power", Power, 2, 10, 1024, nil},
		{"negative operand", Add, 10, -5, 5, nil},

		// Rounding to 15 significant digits.
		{"0.1 + 0.2", Add, 0.1, 0.2, 0.3, nil},
		{"1.1 x 3", Multiply, 1.1, 3, 3.3, nil},
		{"1 ÷ 3", Divide, 1, 3, 0.333333333333333, nil},
		{"0.3 - 0.1", Subtract, 0.3, 0.1, 0.2, nil},

		// Zero handling.
		{"0 x negative is 0, not -0", Multiply, 0, -5, 0, nil},
		{"0 ÷ x", Divide, 0, 5, 0, nil},
		{"exact cancellation", Subtract, 0.5, 0.5, 0, nil},
		{"divide by zero", Divide, 5, 0, 0, ErrDivisionByZero},
		{"zero divided by zero", Divide, 0, 0, 0, ErrDivisionByZero},

		// Power edge cases.
		{"0 ^ 0", Power, 0, 0, 1, nil},
		{"0 ^ positive", Power, 0, 3, 0, nil},
		{"0 ^ negative", Power, 0, -1, 0, ErrZeroToNegativePower},
		{"negative exponent", Power, 2, -2, 0.25, nil},
		{"fractional exponent", Power, 9, 0.5, 3, nil},
		{"negative base, even exponent", Power, -2, 2, 4, nil},
		{"negative base, odd exponent", Power, -2, 3, -8, nil},
		{"negative base, fractional exponent", Power, -8, 0.5, 0, ErrComplexResult},
		{"negative base, 1/3 exponent", Power, -8, 1.0 / 3, 0, ErrComplexResult},
		{"negative base, huge integer exponent", Power, -2, 1e100, 0, ErrResultTooLarge},

		// Result limits.
		{"result at max", Multiply, 1e50, 1e50, 1e100, nil},
		{"result over max", Multiply, 1e50, 1e51, 0, ErrResultTooLarge},
		{"negative result over max", Multiply, -1e50, 1e51, 0, ErrResultTooLarge},
		{"float overflow", Multiply, 1e100, 1e100, 0, ErrResultTooLarge},
		{"power overflow", Power, 10, 400, 0, ErrResultTooLarge},
		{"result at min", Multiply, 1e-50, 1e-50, 1e-100, nil},
		{"result under min", Multiply, 1e-50, 1e-51, 0, ErrResultTooSmall},
		{"float underflow on multiply", Multiply, 1e-100, 1e-100, 0, ErrResultTooSmall},
		{"float underflow on divide", Divide, 1e-100, 1e100, 0, ErrResultTooSmall},
		{"float underflow on power", Power, 1e-100, 5, 0, ErrResultTooSmall},
		{"rounds onto the max limit", Add, 1e100, 1e85, 1e100, nil},

		// Operand validation.
		{"operand over max", Add, 1e101, 1, 0, ErrOperandOutOfRange},
		{"operand under min", Add, 1e-101, 1, 0, ErrOperandOutOfRange},
		{"NaN operand", Add, math.NaN(), 1, 0, ErrInvalidInput},
		{"Inf operand", Add, 1, math.Inf(1), 0, ErrInvalidInput},
		{"unknown operator", Operator("modulo"), 5, 2, 0, ErrUnknownOperator},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Evaluate(tt.op, tt.a, tt.b)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("Evaluate(%s, %v, %v) error = %v, want %v", tt.op, tt.a, tt.b, err, tt.wantErr)
			}
			if got != tt.want {
				t.Errorf("Evaluate(%s, %v, %v) = %v, want %v", tt.op, tt.a, tt.b, got, tt.want)
			}
			if got == 0 && math.Signbit(got) {
				t.Errorf("Evaluate(%s, %v, %v) returned -0", tt.op, tt.a, tt.b)
			}
		})
	}
}

func TestEvaluateErrorsHaveCodes(t *testing.T) {
	_, err := Evaluate(Divide, 1, 0)
	var calcErr *Error
	if !errors.As(err, &calcErr) {
		t.Fatalf("error %v is not a *calc.Error", err)
	}
	if calcErr.Code != CodeDivisionByZero || calcErr.Error() != "Division by 0" {
		t.Errorf("got %+v, want code %s and message %q", calcErr, CodeDivisionByZero, "Division by 0")
	}
}

func TestOperatorValid(t *testing.T) {
	for _, op := range Operators {
		if !op.Valid() {
			t.Errorf("%q should be valid", op)
		}
	}
	for _, op := range []Operator{"", "x", "Add", "mod"} {
		if op.Valid() {
			t.Errorf("%q should be invalid", op)
		}
	}
}
