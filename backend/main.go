package main

import (
	"log"
	"net"
	"os"
	"strings"

	"calculator/internal/api"
)

// Configuration comes from the environment:
//
//	HOST             address to bind (default "localhost")
//	PORT             port to listen on (default "8080")
//	ALLOWED_ORIGINS  comma-separated origins allowed cross-origin (default none)
//	STATIC_DIR       directory of built frontend files to serve (default none: API only)
func main() {
	addr := net.JoinHostPort(getenv("HOST", "localhost"), getenv("PORT", "8080"))
	router := api.NewRouter(api.Config{
		AllowedOrigins: splitList(os.Getenv("ALLOWED_ORIGINS")),
		StaticDir:      os.Getenv("STATIC_DIR"),
	})

	log.Printf("calculator listening on %s", addr)
	if err := router.Run(addr); err != nil {
		log.Fatal(err)
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func splitList(s string) []string {
	var out []string
	for _, item := range strings.Split(s, ",") {
		if item = strings.TrimSpace(item); item != "" {
			out = append(out, item)
		}
	}
	return out
}
