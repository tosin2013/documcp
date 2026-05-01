// Package sample exercises the AST analyzer's tree-sitter-go extractor for
// issue #112. Covers functions, methods (value and pointer receivers),
// structs (with mixed exported/unexported fields), interfaces, imports,
// and variadic params.
package sample

import (
	"fmt"
	stdio "io"

	"context"
)

// Greeter abstracts anything that can produce a greeting for a name.
type Greeter interface {
	Greet(name string) string
	GreetMany(names ...string) []string
}

// Server holds runtime state for the demo HTTP server.
type Server struct {
	Port      int
	host      string
	Greeter   Greeter
	stdio.Reader
}

// NewServer constructs a Server bound to the given port and host.
func NewServer(port int, host string) *Server {
	return &Server{Port: port, host: host}
}

// Start brings the server online and blocks until ctx is done.
func (s *Server) Start(ctx context.Context) error {
	if s.Port == 0 {
		return fmt.Errorf("port is required")
	}
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		}
	}
}

// listen is intentionally lowercase: it's package-private.
func (s *Server) listen() error {
	return nil
}

// Hello is a top-level exported function.
func Hello(name string) string {
	return "hello " + name
}

// helloMany is a top-level unexported variadic function.
func helloMany(prefix string, names ...string) []string {
	out := make([]string, 0, len(names))
	for _, n := range names {
		out = append(out, prefix+n)
	}
	return out
}
