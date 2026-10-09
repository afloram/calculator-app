package calc

import (
	"errors"
	"math"
	"testing"
)

func TestParseNumber(t *testing.T) {
	tests := []struct {
		in      string
		want    float64
		wantErr error
	}{
		{"12", 12, nil},
		{"-12.5", -12.5, nil},
		{"+3", 3, nil},
		{"5.", 5, nil},
		{".5", 0.5, nil},
		{"0", 0, nil},
		{"-0", 0, nil},
		{"3e+12", 3e12, nil},
		{"1.5E-7", 1.5e-7, nil},
		{"123456789012345", 123456789012345, nil},
		{"1e100", 1e100, nil},
		{"-1e100", -1e100, nil},
		{"1e-100", 1e-100, nil},
		{"0e500", 0, nil},

		{"1.0000001e100", 0, ErrOperandOutOfRange},
		{"1e101", 0, ErrOperandOutOfRange},
		{"9.99e-101", 0, ErrOperandOutOfRange},
		{"1e400", 0, ErrOperandOutOfRange},
		{"-1e400", 0, ErrOperandOutOfRange},
		{"1e-400", 0, ErrOperandOutOfRange},

		{"", 0, ErrInvalidInput},
		{"-", 0, ErrInvalidInput},
		{".", 0, ErrInvalidInput},
		{"abc", 0, ErrInvalidInput},
		{"1.2.3", 0, ErrInvalidInput},
		{" 12", 0, ErrInvalidInput},
		{"12 ", 0, ErrInvalidInput},
		{"1e", 0, ErrInvalidInput},
		{"Inf", 0, ErrInvalidInput},
		{"NaN", 0, ErrInvalidInput},
		{"0x10", 0, ErrInvalidInput},
		{"1_000", 0, ErrInvalidInput},
		{"--1", 0, ErrInvalidInput},
	}
	for _, tt := range tests {
		t.Run(tt.in, func(t *testing.T) {
			got, err := ParseNumber(tt.in)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("ParseNumber(%q) error = %v, want %v", tt.in, err, tt.wantErr)
			}
			if got != tt.want {
				t.Errorf("ParseNumber(%q) = %v, want %v", tt.in, got, tt.want)
			}
			if math.Signbit(got) && got == 0 {
				t.Errorf("ParseNumber(%q) returned -0", tt.in)
			}
		})
	}
}

func TestFormatNumber(t *testing.T) {
	tests := []struct {
		in   float64
		want string
	}{
		{0, "0"},
		{math.Copysign(0, -1), "0"},
		{24, "24"},
		{-24, "-24"},
		{0.3, "0.3"},
		{2.5, "2.5"},
		{1234567, "1234567"},
		{123456789012345, "123456789012345"},
		{3e12, "3000000000000"},
		{1e20, "100000000000000000000"},
		{1e21, "1e+21"},
		{-4.5e22, "-4.5e+22"},
		{1e100, "1e+100"},
		{0.000001, "0.000001"},
		{1e-7, "1e-7"},
		{1.2345e-11, "1.2345e-11"},
		{1e-100, "1e-100"},
	}
	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			if got := FormatNumber(tt.in); got != tt.want {
				t.Errorf("FormatNumber(%v) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

func TestFormatNumberRoundTrips(t *testing.T) {
	values := []float64{0.1, 1.0 / 3, 2.0 / 3 * 1e50, -7.123456789012345e-80, 1e100, 1e-100, 123456789012345}
	for _, x := range values {
		s := FormatNumber(x)
		got, err := ParseNumber(s)
		if err != nil {
			t.Fatalf("ParseNumber(FormatNumber(%v) = %q) error: %v", x, s, err)
		}
		if got != x {
			t.Errorf("round trip of %v via %q gave %v", x, s, got)
		}
	}
}

func TestRoundSignificant(t *testing.T) {
	tests := []struct {
		in, want float64
	}{
		{0.1 + 0.2, 0.3},
		{1.1 * 3, 3.3},
		{1.0 / 3, 0.333333333333333},
		{2.0 / 3, 0.666666666666667},
		{123456789012345.6, 123456789012346},
		{0, 0},
	}
	for _, tt := range tests {
		if got := roundSignificant(tt.in); got != tt.want {
			t.Errorf("roundSignificant(%v) = %v, want %v", tt.in, got, tt.want)
		}
	}
}
