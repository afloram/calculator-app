# Builds the frontend and backend, then runs both from one small image:
# the Go server serves the API under /api and the built frontend for everything else.
#
#   docker build -t calculator .
#   docker run --rm -p 8080:8080 calculator
#
# Then open http://localhost:8080

# --- Frontend: compile React + TypeScript into static files (dist/) ---
FROM node:24-alpine AS frontend
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Backend: compile a static Go binary ---
FROM golang:1.27-alpine AS backend
WORKDIR /src/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/calculator .

# --- Runtime: just the binary and the frontend files, running as non-root ---
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=backend /out/calculator /app/calculator
COPY --from=frontend /src/frontend/dist /app/static
ENV HOST=0.0.0.0 \
    PORT=8080 \
    STATIC_DIR=/app/static \
    GIN_MODE=release
EXPOSE 8080
ENTRYPOINT ["/app/calculator"]
