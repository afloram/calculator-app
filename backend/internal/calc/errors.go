package calc

// Code is a stable, machine-readable identifier for a calculation error.
type Code string

const (
	CodeDivisionByZero      Code = "DIVISION_BY_ZERO"
	CodeZeroToNegativePower Code = "ZERO_TO_NEGATIVE_POWER"
	CodeComplexResult       Code = "COMPLEX_RESULT"
	CodeResultTooLarge      Code = "RESULT_TOO_LARGE"
	CodeResultTooSmall      Code = "RESULT_TOO_SMALL"
	CodeOperandOutOfRange   Code = "OPERAND_OUT_OF_RANGE"
	CodeInvalidInput        Code = "INVALID_INPUT"
)

// Error is a calculation error with a stable code and a human-readable message.
type Error struct {
	Code    Code
	Message string
}

func (e *Error) Error() string { return e.Message }

// Sentinel errors returned by this package. Compare with errors.Is.
var (
	ErrDivisionByZero      = &Error{CodeDivisionByZero, "Division by 0"}
	ErrZeroToNegativePower = &Error{CodeZeroToNegativePower, "0 raised to a negative power"}
	ErrComplexResult       = &Error{CodeComplexResult, "Result is not a real number"}
	ErrResultTooLarge      = &Error{CodeResultTooLarge, "Result is too large"}
	ErrResultTooSmall      = &Error{CodeResultTooSmall, "Result is too small"}
	ErrOperandOutOfRange   = &Error{CodeOperandOutOfRange, "Number is out of range"}
	ErrInvalidInput        = &Error{CodeInvalidInput, "Invalid number"}
	ErrUnknownOperator     = &Error{CodeInvalidInput, "Unknown operator"}
)
