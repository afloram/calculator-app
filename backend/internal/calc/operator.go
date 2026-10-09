// Package calc holds the calculator's domain logic: parsing operands,
// evaluating binary operations, enforcing limits and producing canonical
// number strings. It has no knowledge of HTTP or of how numbers are displayed.
package calc

// Operator identifies a binary operation. Values are stable identifiers meant
// to be exposed to clients, not display symbols.
type Operator string

const (
	Add      Operator = "add"
	Subtract Operator = "subtract"
	Multiply Operator = "multiply"
	Divide   Operator = "divide"
	Power    Operator = "power"
)

// Operators lists every supported operator.
var Operators = []Operator{Add, Subtract, Multiply, Divide, Power}

// Valid reports whether op is a supported operator.
func (op Operator) Valid() bool {
	switch op {
	case Add, Subtract, Multiply, Divide, Power:
		return true
	}
	return false
}
