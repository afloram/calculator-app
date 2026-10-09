interface DisplayLine {
  /** Text shown on screen, e.g. "12 x 2". */
  text: string
  /** Text read by screen readers, e.g. "12 times 2". */
  spoken: string
}

interface DisplayProps {
  /** Previous operation, e.g. "12 x 2 =". */
  previous: DisplayLine | null
  /** Current input, e.g. "24 +". */
  input: DisplayLine
  /** Announced politely whenever it changes, e.g. "12 times 2 equals 24". */
  announcement: string
  error: string | null
  busy: boolean
}

/** Font size step for the input line, so long numbers still fit. */
function inputSize(text: string): 'xl' | 'lg' | 'md' | 'sm' | 'xs' {
  if (text.length <= 9) return 'xl'
  if (text.length <= 14) return 'lg'
  if (text.length <= 20) return 'md'
  if (text.length <= 24) return 'sm'
  return 'xs'
}

/** Shows `text` on screen while exposing `spoken` to assistive technology. */
function Spoken({ text, spoken }: DisplayLine) {
  return (
    <>
      <span aria-hidden="true">{text}</span>
      <span className="visually-hidden">{spoken}</span>
    </>
  )
}

export function Display({ previous, input, announcement, error, busy }: DisplayProps) {
  return (
    <div className="display" aria-busy={busy}>
      {/* Live regions are always rendered so screen readers pick up changes to them. */}
      <div className="display__error" role="alert">
        {error}
      </div>
      <div className="visually-hidden" role="status" aria-atomic="true">
        {announcement}
      </div>
      <div className="display__previous" data-testid="previous">
        {previous && <Spoken {...previous} />}
      </div>
      <div className={`display__input display__input--${inputSize(input.text)}`} data-testid="input">
        <Spoken {...input} />
      </div>
    </div>
  )
}
