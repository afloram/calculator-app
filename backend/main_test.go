package main

import (
	"slices"
	"testing"
)

func TestGetenv(t *testing.T) {
	t.Setenv("CALC_TEST_SET", "9090")
	t.Setenv("CALC_TEST_EMPTY", "")

	if got := getenv("CALC_TEST_SET", "8080"); got != "9090" {
		t.Errorf("set variable: got %q, want %q", got, "9090")
	}
	if got := getenv("CALC_TEST_EMPTY", "8080"); got != "8080" {
		t.Errorf("empty variable: got %q, want fallback %q", got, "8080")
	}
	if got := getenv("CALC_TEST_UNSET_VARIABLE", "8080"); got != "8080" {
		t.Errorf("unset variable: got %q, want fallback %q", got, "8080")
	}
}

func TestSplitList(t *testing.T) {
	tests := []struct {
		in   string
		want []string
	}{
		{"", nil},
		{"http://a.example", []string{"http://a.example"}},
		{"http://a.example, http://b.example ,,", []string{"http://a.example", "http://b.example"}},
		{" , ", nil},
	}
	for _, tt := range tests {
		if got := splitList(tt.in); !slices.Equal(got, tt.want) {
			t.Errorf("splitList(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}
