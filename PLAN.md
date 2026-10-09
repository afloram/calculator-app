# Calculator App — Implementation Plan

Based on `INITIAL_DESIGN.md`. All major questions have been answered. ◇ marks a smaller default
proposed in this plan that wasn't explicitly discussed.

## 1. Current state

- `backend/`: Go 1.27 module `calculator`, Gin v1.12, a placeholder `GET /test` endpoint in `main.go`.
- `frontend/`: Vite 8 + React 19 + TypeScript 6 template (boilerplate `App.tsx`, assets, CSS), oxlint.
- No test tooling on either side yet. The project isn't a git repo, and version control stays with the user.

## 2. Architecture overview

```
Browser (React)                                Go backend (Gin)
┌──────────────────────────────┐   POST JSON   ┌─────────────────────────────┐
│ Keypad / keyboard input      │ ────────────▶ │ /api/{add,subtract,         │
│ Pure reducer (input state)   │               │   multiply,divide,power}    │
│ Display (input, prev op, err)│ ◀──────────── │ validate → compute → format │
└──────────────────────────────┘   JSON result └─────────────────────────────┘
```

- **Frontend owns input editing and presentation:** digits, decimal point, sign, operator selection,
  the digit cap, and formatting numbers for display (scientific notation). None of this needs a round
  trip.
- **Backend owns evaluation:** parsing operands, computing, detecting invalid operations, enforcing
  magnitude limits, and rounding results. It returns plain numbers, not display strings.
- The frontend only calls the backend when an operation must be *evaluated*: on `=`, or when an
  operator is entered while a full `a op b` expression exists.

## 3. Backend

### 3.1 Layout

```
backend/
  main.go                  # reads env config, starts the server
  internal/calc/           # pure domain logic, no HTTP
    operator.go            # Operator type: Add, Subtract, Multiply, Divide, Power
    evaluate.go            # Evaluate(op, a, b) (Number, error)
    limits.go              # magnitude limits, 15-digit precision, validation
    number.go              # ParseNumber (strict) / FormatNumber (canonical) / rounding
    errors.go              # typed errors with stable codes
    *_test.go              # table-driven tests
  internal/api/
    router.go              # routes, CORS middleware
    handlers.go            # one handler per operator (thin; delegates to calc)
    types.go               # request/response DTOs
    handlers_test.go       # httptest-based tests
```

### 3.2 Endpoints

One endpoint per operator, all `POST`:

| Endpoint             | Operator |
|----------------------|----------|
| `POST /api/add`      | `+`      |
| `POST /api/subtract` | `-`      |
| `POST /api/multiply` | `x`      |
| `POST /api/divide`   | `÷`      |
| `POST /api/power`    | `^`      |

Plus `GET /api/health` for convenience.

**Request**

Operands are sent as **strings**, so no precision is lost in JSON number parsing and scientific
notation (e.g. a previous result `3e+12`) round-trips cleanly.

```json
{ "left": "12", "right": "2" }
```

**Success response** (`200`)

```json
{
  "ok": true,
  "operation": { "operator": "multiply", "left": "12", "right": "2" },
  "result": "24",
  "error": null
}
```

- `operator` is a stable identifier, not a symbol. The client maps it to whatever symbol it shows
  (`x`, `×`, `*`…) and builds `12 x 2 =` itself. That keeps the API independent of this UI.
- Numbers (`left`, `right`, `result`) are canonical, machine-readable strings, not display text:
  the shortest representation that parses back to the same `float64` (Go
  `strconv.FormatFloat(x, 'g', -1, 64)`, e.g. `"24"`, `"0.3"`, `"3e+12"`). Clients parse them and
  format them however they like. The frontend sends `result` back unchanged as the next operand
  when you chain operations.
- `operation.left` / `operation.right` are the parsed operands in canonical form (e.g. `"5."` sent →
  `"5"` returned), so the previous-operation line shows exactly what was computed.
- Numbers are strings rather than JSON numbers so the request and response use the same format,
  and so no JSON library can quietly change their precision.

**Invalid operation** (`422 Unprocessable Entity`)

```json
{
  "ok": false,
  "operation": { "operator": "divide", "left": "5", "right": "0" },
  "result": null,
  "error": { "code": "DIVISION_BY_ZERO", "message": "Division by 0" }
}
```

The frontend renders it as `Invalid: Division by 0`. Malformed requests (bad JSON, non-numeric
operand, operand over the limits) return `400` with the same shape and code `INVALID_INPUT` /
`OPERAND_OUT_OF_RANGE`. In that case `operation` is `null`, since the operands couldn't be parsed.

**Error codes**

| Code                    | When |
|-------------------------|------|
| `DIVISION_BY_ZERO`      | `x ÷ 0` |
| `ZERO_TO_NEGATIVE_POWER`| `0 ^ -n` (would also divide by zero) |
| `COMPLEX_RESULT`        | negative base with non-integer exponent, e.g. `-8 ^ 0.5` |
| `RESULT_TOO_LARGE`      | \|result\| > max magnitude (includes overflow to ±Inf) |
| `RESULT_TOO_SMALL`      | 0 < \|result\| < min magnitude (underflow) |
| `OPERAND_OUT_OF_RANGE`  | an input operand is over the limits |
| `INVALID_INPUT`         | malformed request |

`0 ^ 0` returns `1` (the usual convention).

### 3.3 Numbers, precision, limits

- **Numeric representation (decided):** `float64`, with every result rounded to **15 significant
  digits** before it's returned. That makes `0.1 + 0.2` give `0.3`, stops errors from building up
  across chained operations, and keeps `value` round-trippable. `^` uses `math.Pow`, so fractional
  exponents work. (An arbitrary-precision decimal library was considered and rejected: it adds
  complexity, and it can't be exact for division or fractional exponents anyway.)
- **Limits (decided):**
  - Max magnitude: `|x| ≤ 1e100`. Larger → `RESULT_TOO_LARGE` / `OPERAND_OUT_OF_RANGE`.
  - Min magnitude: `|x| ≥ 1e-100` (unless exactly 0). Smaller → `RESULT_TOO_SMALL`.
- **Formatting is not done here.** It's handled by the frontend (see 4.3). The backend originally
  owned scientific notation, but the design was changed so each client handles presentation.

### 3.4 Misc

- CORS: in dev the Vite proxy forwards `/api` to `localhost:8080`, so CORS isn't needed. A small
  CORS middleware lets other origins in only if they're listed in `ALLOWED_ORIGINS`.
- Configuration via env vars: `HOST` (default `localhost`), `PORT` (default `8080`),
  `ALLOWED_ORIGINS` (comma-separated, default none, i.e. same-origin only).
- Request bodies are capped at 1 KB.
- When `STATIC_DIR` is set, the server also serves the built frontend for any non-API GET/HEAD path
  (`internal/api/static.go`). Hashed `/assets/*` files are cached forever, `index.html` is
  revalidated, and there are no directory listings.
- Remove the placeholder `/test` endpoint.

## 4. Frontend

### 4.1 Layout

```
frontend/src/
  main.tsx
  App.tsx                       # renders <Calculator />
  calculator/
    types.ts                    # Operator, CalcState, Action
    reducer.ts                  # pure input state machine
    reducer.test.ts
    display.ts                  # state → input-line / previous-line text
    spoken.ts                   # screen-reader text ("12 times 2", "3 times 10 to the power of 12")
    spoken.test.ts
    useKeyboard.ts              # window keydown → press()
    keyboard.ts                 # KeyboardEvent.key → Input
    keyboard.test.ts
    operators.ts                # operator id ↔ symbol ↔ spoken name ↔ keyboard keys
    operators.test.ts
    format.ts                   # number string → display string (plain / scientific)
    format.test.ts
    useCalculator.ts            # hook: reducer + API calls + error timeout
    useCalculator.test.ts
  api/
    client.ts                   # typed fetch wrapper for /api/*
    client.test.ts
  test/setup.ts                 # jest-dom matchers, Testing Library cleanup
  vite-env.d.ts                 # VITE_API_BASE_URL typing (optional API origin; default same-origin)
  components/
    Calculator.tsx / .css       # wires useCalculator to Display + Keypad
    Calculator.test.tsx
    Display.tsx                 # error banner (role="alert") + previous-operation line + input line
    Keypad.tsx                  # button grid
```

Remove the Vite boilerplate (`hero.png`, logos, demo CSS, unused `icons.svg`).

### 4.2 Input state machine

State (`calculator/types.ts`):

```ts
{
  left: string                     // typed text ("-12.", "" when empty) or a backend result
  leftIsResult: boolean            // results can't be edited; "result shown" = leftIsResult && !operator
  operator: Operator | null
  right: string                    // "" when empty, "-" when only the sign is typed
  previous: Operation | null       // last evaluated operation, for the small line above
  pending: PendingEvaluation | null // { left, operator, right, next } while waiting for the backend
  error: string | null             // message currently shown
}
```

The reducer is pure: when something must be evaluated it only sets `pending`. `useCalculator` sees
that, calls the backend (aborting if `pending` disappears, e.g. on `AC`), and dispatches
`evaluationSucceeded` / `evaluationFailed`. An effect hides the error after 3 s.

Behavior per input (✔ = from the design, ◇ = proposed default, may change with your answers):

| Input | Situation | Behavior |
|---|---|---|
| digit | normal | ✔ append to the current operand. ◇ Leading zero replaced (`0`→`5`), `00` not allowed |
| digit | digit cap reached | ✔ ignored |
| digit / `.` | `justEvaluated` | ✔ start a new expression (`left = digit` or `0.`, previous line cleared) |
| `.` | current operand empty | ✔ `0.` |
| `.` | operand already has `.` | ✔ ignored |
| operator | nothing entered | ✔ `-` starts a negative first operand; other operators ignored |
| operator | `left` only | ✔ set operator. ◇ A trailing `.` is dropped (`5.` → `5 +`) |
| operator | `left op` (no right) | ✔ `-` becomes the sign of the right operand. ◇ any other operator replaces the current one |
| operator | `left op -` | ◇ `-` ignored; any other operator replaces `op` and drops the sign |
| operator | `left op right` | ✔ evaluate. On success: `left = result`, `operator = new op`, previous line = evaluated operation |
| operator | `justEvaluated` | ◇ continue with the result as `left` (`10` → `10 +`) |
| `=` | `left op right` | ✔ evaluate, show result, previous line = `a op b =` |
| `=` | result shown (after `=`, or after deleting the operator that followed a chained result) | ✔ repeat the last operator and second operand on the result: `10 + 1 = 11`, then `=` → `12`, `13`… The previous line updates to `11 + 1 =` |
| `=` | incomplete expression (e.g. `5 +`) | ◇ ignored |
| any | backend error | ✔ show `Invalid: <message>` for ~3 s (dismissed early by the next input), state unchanged |
| any but `AC` | `pending` | ◇ ignored until the response arrives (one request at a time) |
| `AC` | `pending` | ◇ cancels the request and resets |
| `⌫` | typing an operand | ✔ remove the last character (digit, `.`, or a lone `-` sign) |
| `⌫` | `left op` (no right) | ✔ remove the operator, back to `left` |
| `⌫` | `left` came from a chained result (e.g. `24 +` → `⌫` → `24`) | ✔ nothing further to delete in `24`: ignored |
| `⌫` | `justEvaluated` | ✔ ignored (a result isn't typed input) |
| `AC` | any | ✔ reset everything: input, operator, and the previous-operation line |

Operands that are only `-` or end in `.` are normalized before sending (`5.` → `5`; you can't
evaluate with a lone `-`).

- **Delete and clear (required by the design, decided):** `⌫` removes one symbol and `AC`
  resets everything (see the table above). There's no separate `C` (clear entry) key.
- **Digit cap (decided):** max **15 digits per operand** (sign and `.` don't count), which matches the
  `float64` precision (see 3.3). A result coming back from the backend isn't subject to the cap, but
  typing a digit after `=` starts a new number anyway.

### 4.3 Number formatting

`format.ts` turns a backend number string into display text:

- Scientific notation when `|x| ≥ 1e10` or `0 < |x| ≤ 1e-10`; plain decimal otherwise.
- Scientific format: mantissa with trailing zeros removed, explicit exponent sign, no exponent
  padding: `3e+12`, `1.2345e-11`, `-4.5e+20`.
- Plain format: no trailing zeros or trailing `.` (`2.50` → `2.5`), `-0` → `0`.
- Applied to results and to the operands on the previous-operation line. An operand you're still
  typing is shown exactly as typed (so `5.` and `-` stay visible while you enter them).
- Custom code is needed because JavaScript's built-in conversion uses different thresholds (`1e21`
  and `1e-7`).

### 4.4 UI and accessibility

- **Layout:** a display on top (small previous-operation line, large input line, error banner),
  with a 4- or 5-column keypad below:
  ```
  [ AC ] [ ⌫ ] [ ^ ] [ ÷ ]
  [ 7 ]  [ 8 ] [ 9 ] [ x ]
  [ 4 ]  [ 5 ] [ 6 ] [ - ]
  [ 1 ]  [ 2 ] [ 3 ] [ + ]
  [   0      ] [ . ] [ = ]
  ```
- **Responsive:** two breakpoints. On mobile (< 600 px) the calculator fills the viewport and the
  keys stretch. On desktop it's a centered 360 px card. The input font steps down in five sizes as
  the text gets longer, and very long expressions wrap at spaces.
- **Theme:** colors are CSS custom properties in `index.css`, with a dark set under
  `prefers-color-scheme: dark`.
- **Accessibility:**
  - Real `<button>`s with accessible names (`aria-label="multiply"`, `"divide"`,
    `"to the power of"`, `"decimal point"`, `"backspace"`, `"all clear"`).
  - A visually hidden `role="status"` region announces the input as it's typed, and
    "12 times 2 equals 24" after an evaluation. The error banner uses `role="alert"`. The display
    is `aria-busy` while waiting for the backend.
  - Full keyboard support (required by the design): `0-9`, `.`/`,`, `+ - * x / ^`, `Enter`/`=`,
    `Backspace`/`Delete`, `Escape` (= AC). Handled keys have their default action prevented, so
    Enter on a focused key means `=` only. Ctrl/Alt/Meta shortcuts are left to the browser.
    Visible focus styles.
  - WCAG AA contrast (checked for every text/background pair and the focus ring in both themes),
    ≥ 44×44 px touch targets, `prefers-color-scheme` (light/dark), `prefers-reduced-motion`, and
    borders under `forced-colors` (Windows High Contrast).
  - Screen readers hear spoken operator names, not raw symbols (e.g. "12 times 2"): each display
    line has an `aria-hidden` visual version and a visually hidden spoken version.

### 4.5 Tooling

- **Vitest** + **@testing-library/react** (+ `user-event`, `jest-dom`) + **jsdom** for unit and
  component tests. `npm test` runs them once, `npm run test:watch` in watch mode.
- Vite dev proxy: `/api` → `http://localhost:8080`.

## 5. Testing strategy

- **Backend:** table-driven tests for `Evaluate` (each operator, every error code, limit edges such as
  `1e100`, `1e-100`, overflow, underflow, `0^0`, `-8^(1/3)`, 15-digit rounding) and for the canonical
  number output. Handler tests with `httptest` check status codes and JSON shape.
- **Frontend:** reducer tests covering every row of the table in 4.2. `format` tests around the
  `1e10` and `1e-10` thresholds, negatives, trailing zeros and `-0`. API client tests with mocked
  `fetch`. Component tests for keyboard input, aria attributes, and how errors are shown.
- **Coverage reports (required by the assignment):** `go test -coverprofile` + `go tool cover -html`
  for the backend, and `npm run test:coverage` (Vitest + `@vitest/coverage-v8`; text, HTML and lcov)
  for the frontend. The generated report files are git- and docker-ignored; a snapshot of both is
  committed in `coverage-report/` so reviewers can view them without running anything (README
  explains how to view and refresh it).
- **E2E (decided):** skipped for now. A Playwright smoke test can be added later.

## 6. Implementation phases

1. **Backend core:** `internal/calc` (operators, evaluate, limits, errors, canonical output) + tests.
2. **Backend API:** handlers, DTOs, routing, CORS, config + handler tests. Remove `/test`.
3. **Frontend foundation:** clean boilerplate, add Vitest, Vite proxy, `operators.ts`, `format.ts`,
   API client + tests.
4. **Input state machine:** `reducer.ts` + exhaustive tests, `useCalculator` hook.
5. **UI:** `Display`, `Keypad`, `Calculator`, responsive CSS (mobile + desktop), light/dark theme.
6. **Accessibility pass:** keyboard handling, aria, focus, contrast, reduced motion. Component tests.
7. **Wrap-up:** root `README.md` with run/test instructions, plus a multi-stage `Dockerfile` that runs
   frontend and backend together (required by the assignment). Node builds the frontend, Go builds
   a static binary, and the final distroless image runs the Go server with `STATIC_DIR` pointing at
   the built files. One container, one port, same origin. No separate dev start script: the README
   lists the two dev commands.

## 7. Remaining defaults (not explicitly decided)

- Invalid operations return `422` with `ok: false` (malformed requests return `400`).
- Visual style: clean and neutral, with light and dark themes.
