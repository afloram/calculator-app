package api

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// staticFiles serves the built frontend from dir for any GET/HEAD request
// that no API route matched. Everything else gets a 404.
//
// Vite puts content-hashed files under /assets/, so those can be cached
// forever. Other files (index.html) must be revalidated so a new deploy is
// picked up.
func staticFiles(dir string) gin.HandlerFunc {
	files := http.FileServer(http.Dir(dir))
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		method := c.Request.Method
		isAPI := path == "/api" || strings.HasPrefix(path, "/api/")
		// No directory listings: only "/" may end in a slash (it serves index.html).
		isDir := path != "/" && strings.HasSuffix(path, "/")
		if (method != http.MethodGet && method != http.MethodHead) || isAPI || isDir {
			c.Status(http.StatusNotFound)
			return
		}

		if strings.HasPrefix(path, "/assets/") {
			c.Header("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			c.Header("Cache-Control", "no-cache")
		}
		files.ServeHTTP(c.Writer, c.Request)
	}
}
