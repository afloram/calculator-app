package api

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func newStaticTestRouter(t *testing.T) http.Handler {
	t.Helper()
	dir := t.TempDir()
	write := func(name, content string) {
		path := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	write("index.html", "<!doctype html><title>Calculator</title>")
	write("favicon.svg", "<svg></svg>")
	write("assets/index-abc123.js", "console.log('app')")
	return NewRouter(Config{StaticDir: dir})
}

func TestStaticFiles(t *testing.T) {
	r := newStaticTestRouter(t)

	tests := []struct {
		path, wantBody, wantCache string
	}{
		{"/", "<title>Calculator</title>", "no-cache"},
		{"/favicon.svg", "<svg></svg>", "no-cache"},
		{"/assets/index-abc123.js", "console.log('app')", "public, max-age=31536000, immutable"},
	}
	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			rec := do(t, r, http.MethodGet, tt.path, "", nil)
			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200", rec.Code)
			}
			if !strings.Contains(rec.Body.String(), tt.wantBody) {
				t.Errorf("body = %q, want it to contain %q", rec.Body, tt.wantBody)
			}
			if got := rec.Header().Get("Cache-Control"); got != tt.wantCache {
				t.Errorf("Cache-Control = %q, want %q", got, tt.wantCache)
			}
		})
	}
}

func TestStaticFilesNotFound(t *testing.T) {
	r := newStaticTestRouter(t)

	tests := []struct{ method, path string }{
		{http.MethodGet, "/missing.js"},
		{http.MethodGet, "/assets/"}, // no directory listings
		{http.MethodGet, "/api/add"}, // API paths never fall through to files
		{http.MethodGet, "/api/unknown"},
		{http.MethodPost, "/index.html"},      // files are GET/HEAD only
		{http.MethodGet, "/../../etc/passwd"}, // no escaping the directory
	}
	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			rec := do(t, r, tt.method, tt.path, "", nil)
			if rec.Code != http.StatusNotFound {
				t.Errorf("status = %d, want 404", rec.Code)
			}
		})
	}
}

func TestStaticFilesDoNotAffectAPI(t *testing.T) {
	r := newStaticTestRouter(t)

	rec := do(t, r, http.MethodPost, "/api/add", `{"left":"1","right":"2"}`, nil)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"result":"3"`) {
		t.Errorf("POST /api/add: status %d body %s", rec.Code, rec.Body)
	}
}
