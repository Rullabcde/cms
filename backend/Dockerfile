# Build Stage
FROM golang:1.26.4-alpine AS builder
RUN apk add --no-cache git
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download && go mod verify
COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s -extldflags=-static" -trimpath -o /server ./cmd/server

# Runtime Stage
FROM gcr.io/distroless/static-debian12:nonroot
USER 65532:65532
WORKDIR /app
COPY --from=builder /server .
EXPOSE 8080
# HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
#   CMD ["/server", "--health"] || exit 1
ENTRYPOINT ["./server"]
