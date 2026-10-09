package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"calculator/internal/calc"
)

// maxBodyBytes caps request bodies; a valid request is well under 1 KB.
const maxBodyBytes = 1 << 10

var errBadRequestBody = &calc.Error{Code: calc.CodeInvalidInput, Message: "Invalid request body"}

// calculate returns the handler for one operator endpoint.
func calculate(op calc.Operator) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req CalculateRequest
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBodyBytes)
		if err := json.NewDecoder(c.Request.Body).Decode(&req); err != nil {
			respondError(c, nil, errBadRequestBody)
			return
		}

		left, err := calc.ParseNumber(req.Left)
		if err != nil {
			respondError(c, nil, err)
			return
		}
		right, err := calc.ParseNumber(req.Right)
		if err != nil {
			respondError(c, nil, err)
			return
		}

		operation := &Operation{
			Operator: op,
			Left:     calc.FormatNumber(left),
			Right:    calc.FormatNumber(right),
		}
		value, err := calc.Evaluate(op, left, right)
		if err != nil {
			respondError(c, operation, err)
			return
		}

		result := calc.FormatNumber(value)
		c.JSON(http.StatusOK, CalculateResponse{OK: true, Operation: operation, Result: &result})
	}
}

// respondError writes a failed CalculateResponse. Problems with the request
// itself are 400s; valid requests describing an invalid operation are 422s.
func respondError(c *gin.Context, operation *Operation, err error) {
	var calcErr *calc.Error
	if !errors.As(err, &calcErr) {
		c.JSON(http.StatusInternalServerError, CalculateResponse{
			Error: &ErrorBody{Code: "INTERNAL_ERROR", Message: "Internal error"},
		})
		return
	}

	status := http.StatusUnprocessableEntity
	if calcErr.Code == calc.CodeInvalidInput || calcErr.Code == calc.CodeOperandOutOfRange {
		status = http.StatusBadRequest
	}
	c.JSON(status, CalculateResponse{
		Operation: operation,
		Error:     &ErrorBody{Code: calcErr.Code, Message: calcErr.Message},
	})
}

func health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
