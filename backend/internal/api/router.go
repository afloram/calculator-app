package api

import (
	"net/http"
	"slices"

	"github.com/gin-gonic/gin"

	"calculator/internal/calc"
)

// Config configures the HTTP router.
type Config struct {
	// AllowedOrigins lists origins allowed to call the API cross-origin.
	// Empty means same-origin only (e.g. through the Vite dev proxy).
	AllowedOrigins []string
	// StaticDir, if set, is a directory of frontend files (the Vite build)
	// served for every non-API path.
	StaticDir string
}

// NewRouter builds the router: POST /api/<operator> for every operator,
// GET /api/health, and the frontend files when cfg.StaticDir is set.
func NewRouter(cfg Config) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), cors(cfg.AllowedOrigins))
	// We don't sit behind a proxy, so don't trust X-Forwarded-For.
	_ = r.SetTrustedProxies(nil)

	api := r.Group("/api")
	api.GET("/health", health)
	for _, op := range calc.Operators {
		api.POST("/"+string(op), calculate(op))
	}
	if cfg.StaticDir != "" {
		r.NoRoute(staticFiles(cfg.StaticDir))
	}
	return r
}

// cors allows cross-origin requests from the given origins and answers
// preflight requests.
func cors(allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" && slices.Contains(allowedOrigins, origin) {
			h := c.Writer.Header()
			h.Set("Access-Control-Allow-Origin", origin)
			h.Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			h.Set("Access-Control-Allow-Headers", "Content-Type")
			h.Add("Vary", "Origin")
			if c.Request.Method == http.MethodOptions {
				c.AbortWithStatus(http.StatusNoContent)
				return
			}
		}
		c.Next()
	}
}
