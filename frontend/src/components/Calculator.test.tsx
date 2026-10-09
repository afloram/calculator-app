import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { calculate, CalculateResult } from '../api/client'
import { Calculator } from './Calculator'

function setup(response?: CalculateResult) {
  const calculateFn = vi.fn<typeof calculate>()
  if (response) {
    calculateFn.mockResolvedValue(response)
  }
  const user = userEvent.setup()
  render(<Calculator calculateFn={calculateFn} />)
  return { calculateFn, user }
}

const multiplyResult: CalculateResult = {
  ok: true,
  operation: { operator: 'multiply', left: '12', right: '2' },
  result: '24',
}

/** The text shown on screen for a display line (excluding its screen-reader text). */
function shown(testId: string) {
  return screen.getByTestId(testId).querySelector('[aria-hidden="true"]')?.textContent ?? ''
}

function clickAll(user: ReturnType<typeof userEvent.setup>, names: string[]) {
  return names.reduce(
    (prev, name) => prev.then(() => user.click(screen.getByRole('button', { name }))),
    Promise.resolve(),
  )
}

describe('Calculator', () => {
  describe('keypad', () => {
    it('evaluates an operation entered with the keypad', async () => {
      const { calculateFn, user } = setup(multiplyResult)
      expect(shown('input')).toBe('0')

      await clickAll(user, ['1', '2', 'multiply', '2'])
      expect(shown('input')).toBe('12 x 2')

      await clickAll(user, ['equals'])
      expect(calculateFn).toHaveBeenCalledWith('multiply', '12', '2', expect.anything())
      await vi.waitFor(() => expect(shown('input')).toBe('24'))
      expect(shown('previous')).toBe('12 x 2 =')
    })

    it('has delete and clear buttons', async () => {
      const { user } = setup()

      await clickAll(user, ['1', '2', '3', 'delete'])
      expect(shown('input')).toBe('12')

      await clickAll(user, ['clear'])
      expect(shown('input')).toBe('0')
    })

    it('gives every button an accessible name', () => {
      setup()
      const names = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label') ?? button.textContent)
      expect(names).toEqual([
        'clear', 'delete', 'power', 'divide',
        '7', '8', '9', 'multiply',
        '4', '5', '6', 'minus',
        '1', '2', '3', 'plus',
        '0', 'decimal point', 'equals',
      ])
    })
  })

  describe('keyboard', () => {
    it('accepts typed input', async () => {
      const { calculateFn, user } = setup(multiplyResult)

      await user.keyboard('12*2')
      expect(shown('input')).toBe('12 x 2')

      await user.keyboard('{Enter}')
      expect(calculateFn).toHaveBeenCalledWith('multiply', '12', '2', expect.anything())
      await vi.waitFor(() => expect(shown('input')).toBe('24'))
    })

    it('repeats the last operation when "=" is pressed again', async () => {
      const { calculateFn, user } = setup()
      calculateFn
        .mockResolvedValueOnce({ ok: true, operation: { operator: 'add', left: '10', right: '1' }, result: '11' })
        .mockResolvedValueOnce({ ok: true, operation: { operator: 'add', left: '11', right: '1' }, result: '12' })

      await user.keyboard('10+1=')
      await vi.waitFor(() => expect(shown('input')).toBe('11'))
      await user.keyboard('=')
      await vi.waitFor(() => expect(shown('input')).toBe('12'))

      expect(calculateFn).toHaveBeenLastCalledWith('add', '11', '1', expect.anything())
      expect(shown('previous')).toBe('11 + 1 =')
      expect(screen.getByRole('status')).toHaveTextContent('11 plus 1 equals 12')
    })

    it('supports all operators, decimal point, delete and clear', async () => {
      const { user } = setup()

      await user.keyboard('1.5^')
      expect(shown('input')).toBe('1.5 ^')
      await user.keyboard('{Backspace}/')
      expect(shown('input')).toBe('1.5 ÷')
      await user.keyboard('{Backspace}x-,')
      expect(shown('input')).toBe('1.5 x -0.')
      await user.keyboard('{Escape}')
      expect(shown('input')).toBe('0')
    })

    it('ignores shortcuts with modifier keys', async () => {
      const { user } = setup()

      await user.keyboard('{Control>}5{/Control}{Meta>}6{/Meta}{Alt>}7{/Alt}')
      expect(shown('input')).toBe('0')
    })

    it('treats Enter on a focused button as "=" only, not as a click', async () => {
      const { calculateFn, user } = setup()

      // "=" has nothing to evaluate here, so a stray click on "7" would show up.
      await user.keyboard('12*')
      screen.getByRole('button', { name: '7' }).focus()
      await user.keyboard('{Enter}')

      expect(shown('input')).toBe('12 x')
      expect(calculateFn).not.toHaveBeenCalled()
    })

    it('still lets Space activate a focused button', async () => {
      const { user } = setup()

      screen.getByRole('button', { name: '7' }).focus()
      await user.keyboard(' ')
      expect(shown('input')).toBe('7')
    })
  })

  describe('screen readers', () => {
    it('exposes spoken text for the display lines', async () => {
      const { user } = setup(multiplyResult)

      await user.keyboard('12*-')
      expect(within(screen.getByTestId('input')).getByText('12 times negative')).toHaveClass('visually-hidden')

      await user.keyboard('{Backspace}2=')
      await vi.waitFor(() =>
        expect(within(screen.getByTestId('previous')).getByText('12 times 2 equals')).toBeInTheDocument(),
      )
    })

    it('announces input and results in a status region', async () => {
      const { user } = setup(multiplyResult)
      const status = screen.getByRole('status')

      await user.keyboard('12*2')
      expect(status).toHaveTextContent('12 times 2')

      await user.keyboard('=')
      await vi.waitFor(() => expect(status).toHaveTextContent('12 times 2 equals 24'))
    })

    it('announces invalid operations as alerts', async () => {
      const { user } = setup({
        ok: false,
        operation: { operator: 'divide', left: '5', right: '0' },
        error: { code: 'DIVISION_BY_ZERO', message: 'Division by 0' },
      })
      expect(screen.getByRole('alert')).toBeEmptyDOMElement()

      await user.keyboard('5/0=')
      await vi.waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Invalid: Division by 0'))
      expect(shown('input')).toBe('5 ÷ 0')
    })

    it('marks the display busy while waiting for the backend', async () => {
      const { calculateFn, user } = setup()
      calculateFn.mockReturnValue(new Promise(() => {}))

      await user.keyboard('1+1=')
      expect(screen.getByTestId('input').parentElement).toHaveAttribute('aria-busy', 'true')
    })
  })
})
