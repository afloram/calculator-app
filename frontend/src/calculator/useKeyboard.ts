import { useEffect } from 'react'
import { inputFromKey } from './keyboard'
import type { Input } from './types'

/**
 * Lets the calculator be used from the keyboard anywhere on the page.
 *
 * Handled keys have their default action prevented. That stops "/" opening
 * Firefox's quick find, and stops Enter on a focused keypad button from
 * also clicking it (Enter always means "="). Shortcuts with Ctrl, Alt or
 * Meta are left to the browser.
 */
export function useKeyboard(press: (input: Input) => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) {
        return
      }
      const input = inputFromKey(event.key)
      if (!input) {
        return
      }
      event.preventDefault()
      press(input)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [press])
}
