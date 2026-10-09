// Package api exposes the calculator over HTTP as JSON.
package api

import "calculator/internal/calc"

// CalculateRequest is the body of every operator endpoint. Operands are
// strings so no precision is lost in JSON number parsing.
type CalculateRequest struct {
	Left  string `json:"left"`
	Right string `json:"right"`
}

// Operation describes the evaluated operation, with operands in canonical form.
type Operation struct {
	Operator calc.Operator `json:"operator"`
	Left     string        `json:"left"`
	Right    string        `json:"right"`
}

// ErrorBody describes why an operation failed.
type ErrorBody struct {
	Code    calc.Code `json:"code"`
	Message string    `json:"message"`
}

// CalculateResponse is returned by every operator endpoint, on success and on
// failure. Fields that don't apply are null.
type CalculateResponse struct {
	OK        bool       `json:"ok"`
	Operation *Operation `json:"operation"`
	Result    *string    `json:"result"`
	Error     *ErrorBody `json:"error"`
}
