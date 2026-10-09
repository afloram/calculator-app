import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Display } from './Display'

function renderInput(text: string) {
  render(
    <Display previous={null} input={{ text, spoken: text }} announcement="" error={null} busy={false} />,
  )
  return screen.getByTestId('input')
}

describe('Display', () => {
  it.each([
    ['123456789', 'xl'],
    ['1234567890', 'lg'],
    ['12345678901234', 'lg'],
    ['123456789012345', 'md'],
    ['12345678901234567890', 'md'],
    ['123456789012345678901', 'sm'],
    ['123456789012345678901234', 'sm'],
    ['1234567890123456789012345', 'xs'],
  ])('sizes a %i-character input as %s', (text, size) => {
    expect(renderInput(text)).toHaveClass(`display__input--${size}`)
  })

  it('renders the previous line and error when given', () => {
    render(
      <Display
        previous={{ text: '12 x 2 =', spoken: '12 times 2 equals' }}
        input={{ text: '24', spoken: '24' }}
        announcement="12 times 2 equals 24"
        error="Invalid: Division by 0"
        busy
      />,
    )
    expect(screen.getByTestId('previous')).toHaveTextContent('12 x 2 =')
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid: Division by 0')
    expect(screen.getByRole('status')).toHaveTextContent('12 times 2 equals 24')
  })
})
