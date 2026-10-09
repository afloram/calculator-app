package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func newTestRouter() *gin.Engine {
	r := NewRouter(Config{AllowedOrigins: []string{"http://allowed.example"}})
	return r
}

func do(t *testing.T, r http.Handler, method, path, body string, headers map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	return rec
}

func decode(t *testing.T, rec *httptest.ResponseRecorder) CalculateResponse {
	t.Helper()
	var resp CalculateResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid JSON response %q: %v", rec.Body.String(), err)
	}
	return resp
}

func TestCalculateSuccess(t *testing.T) {
	tests := []struct {
		path, body             string
		wantLeft, wantRight    string
		wantResult, wantOpName string
	}{
		{"/api/add", `{"left":"5","right":"2"}`, "5", "2", "7", "add"},
		{"/api/subtract", `{"left":"5","right":"-2"}`, "5", "-2", "7", "subtract"},
		{"/api/multiply", `{"left":"12","right":"2"}`, "12", "2", "24", "multiply"},
		{"/api/divide", `{"left":"1","right":"3"}`, "1", "3", "0.333333333333333", "divide"},
		{"/api/power", `{"left":"2","right":"0.5"}`, "2", "0.5", "1.4142135623731", "power"},
		// Operands are echoed back in canonical form.
		{"/api/add", `{"left":"5.","right":".50"}`, "5", "0.5", "5.5", "add"},
		{"/api/add", `{"left":"-0","right":"0"}`, "0", "0", "0", "add"},
		// Previous results in exponent form can be chained.
		{"/api/multiply", `{"left":"3e+12","right":"1e+10"}`, "3000000000000", "10000000000", "3e+22", "multiply"},
		{"/api/add", `{"left":"0.1","right":"0.2"}`, "0.1", "0.2", "0.3", "add"},
	}
	r := newTestRouter()
	for _, tt := range tests {
		t.Run(tt.path+" "+tt.body, func(t *testing.T) {
			rec := do(t, r, http.MethodPost, tt.path, tt.body, nil)
			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200; body %s", rec.Code, rec.Body)
			}
			resp := decode(t, rec)
			if !resp.OK || resp.Error != nil || resp.Result == nil || resp.Operation == nil {
				t.Fatalf("unexpected response shape: %s", rec.Body)
			}
			if string(resp.Operation.Operator) != tt.wantOpName ||
				resp.Operation.Left != tt.wantLeft || resp.Operation.Right != tt.wantRight {
				t.Errorf("operation = %+v, want %s %s %s", *resp.Operation, tt.wantLeft, tt.wantOpName, tt.wantRight)
			}
			if *resp.Result != tt.wantResult {
				t.Errorf("result = %q, want %q", *resp.Result, tt.wantResult)
			}
		})
	}
}

func TestCalculateResponseJSONShape(t *testing.T) {
	r := newTestRouter()

	rec := do(t, r, http.MethodPost, "/api/multiply", `{"left":"12","right":"2"}`, nil)
	want := `{"ok":true,"operation":{"operator":"multiply","left":"12","right":"2"},"result":"24","error":null}`
	if got := rec.Body.String(); got != want {
		t.Errorf("success body =\n  %s\nwant\n  %s", got, want)
	}

	rec = do(t, r, http.MethodPost, "/api/divide", `{"left":"5","right":"0"}`, nil)
	want = `{"ok":false,"operation":{"operator":"divide","left":"5","right":"0"},"result":null,"error":{"code":"DIVISION_BY_ZERO","message":"Division by 0"}}`
	if got := rec.Body.String(); got != want {
		t.Errorf("error body =\n  %s\nwant\n  %s", got, want)
	}
}

func TestCalculateInvalidOperation(t *testing.T) {
	tests := []struct {
		path, body, wantCode string
	}{
		{"/api/divide", `{"left":"5","right":"0"}`, "DIVISION_BY_ZERO"},
		{"/api/power", `{"left":"0","right":"-1"}`, "ZERO_TO_NEGATIVE_POWER"},
		{"/api/power", `{"left":"-8","right":"0.5"}`, "COMPLEX_RESULT"},
		{"/api/multiply", `{"left":"1e60","right":"1e60"}`, "RESULT_TOO_LARGE"},
		{"/api/divide", `{"left":"1e-60","right":"1e60"}`, "RESULT_TOO_SMALL"},
	}
	r := newTestRouter()
	for _, tt := range tests {
		t.Run(tt.wantCode, func(t *testing.T) {
			rec := do(t, r, http.MethodPost, tt.path, tt.body, nil)
			if rec.Code != http.StatusUnprocessableEntity {
				t.Fatalf("status = %d, want 422; body %s", rec.Code, rec.Body)
			}
			resp := decode(t, rec)
			if resp.OK || resp.Result != nil || resp.Error == nil || resp.Operation == nil {
				t.Fatalf("unexpected response shape: %s", rec.Body)
			}
			if string(resp.Error.Code) != tt.wantCode || resp.Error.Message == "" {
				t.Errorf("error = %+v, want code %s with a message", *resp.Error, tt.wantCode)
			}
		})
	}
}

func TestCalculateBadRequest(t *testing.T) {
	tests := []struct {
		name, body, wantCode string
	}{
		{"malformed JSON", `{"left":`, "INVALID_INPUT"},
		{"not an object", `[1,2]`, "INVALID_INPUT"},
		{"numbers instead of strings", `{"left":5,"right":2}`, "INVALID_INPUT"},
		{"missing right", `{"left":"5"}`, "INVALID_INPUT"},
		{"empty body", ``, "INVALID_INPUT"},
		{"non-numeric operand", `{"left":"abc","right":"2"}`, "INVALID_INPUT"},
		{"lone sign", `{"left":"5","right":"-"}`, "INVALID_INPUT"},
		{"operand too large", `{"left":"1e101","right":"2"}`, "OPERAND_OUT_OF_RANGE"},
		{"operand too small", `{"left":"5","right":"1e-101"}`, "OPERAND_OUT_OF_RANGE"},
		{"body too large", `{"left":"` + strings.Repeat("1", 2000) + `","right":"2"}`, "INVALID_INPUT"},
	}
	r := newTestRouter()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := do(t, r, http.MethodPost, "/api/add", tt.body, nil)
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400; body %s", rec.Code, rec.Body)
			}
			resp := decode(t, rec)
			if resp.OK || resp.Error == nil || resp.Operation != nil || resp.Result != nil {
				t.Fatalf("unexpected response shape: %s", rec.Body)
			}
			if string(resp.Error.Code) != tt.wantCode {
				t.Errorf("code = %s, want %s", resp.Error.Code, tt.wantCode)
			}
		})
	}
}

func TestRouting(t *testing.T) {
	r := newTestRouter()

	rec := do(t, r, http.MethodGet, "/api/health", "", nil)
	if rec.Code != http.StatusOK || rec.Body.String() != `{"status":"ok"}` {
		t.Errorf("health: status %d body %s", rec.Code, rec.Body)
	}

	for _, path := range []string{"/api/modulo", "/api/v1/add", "/test"} {
		if rec := do(t, r, http.MethodPost, path, `{"left":"1","right":"2"}`, nil); rec.Code != http.StatusNotFound {
			t.Errorf("POST %s: status = %d, want 404", path, rec.Code)
		}
	}
	if rec := do(t, r, http.MethodGet, "/api/add", "", nil); rec.Code == http.StatusOK {
		t.Errorf("GET /api/add should not succeed")
	}
}

func TestCORS(t *testing.T) {
	r := newTestRouter()
	body := `{"left":"1","right":"2"}`

	rec := do(t, r, http.MethodPost, "/api/add", body, map[string]string{"Origin": "http://allowed.example"})
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://allowed.example" {
		t.Errorf("allowed origin: Access-Control-Allow-Origin = %q", got)
	}

	rec = do(t, r, http.MethodPost, "/api/add", body, map[string]string{"Origin": "http://evil.example"})
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("disallowed origin: Access-Control-Allow-Origin = %q, want none", got)
	}

	rec = do(t, r, http.MethodOptions, "/api/add", "", map[string]string{
		"Origin":                        "http://allowed.example",
		"Access-Control-Request-Method": "POST",
	})
	if rec.Code != http.StatusNoContent {
		t.Errorf("preflight: status = %d, want 204", rec.Code)
	}
	if got := rec.Header().Get("Access-Control-Allow-Methods"); !strings.Contains(got, "POST") {
		t.Errorf("preflight: Access-Control-Allow-Methods = %q", got)
	}
}
