import { inputText, operationText } from '../calculator/display'
import { announcement, spokenInput, spokenOperation } from '../calculator/spoken'
import { useCalculator, type UseCalculatorOptions } from '../calculator/useCalculator'
import { useKeyboard } from '../calculator/useKeyboard'
import { Display } from './Display'
import { Keypad } from './Keypad'
import './Calculator.css'

export function Calculator(options: UseCalculatorOptions) {
  const { state, press } = useCalculator(options)
  useKeyboard(press)

  return (
    <section className="calculator" aria-label="Calculator">
      <Display
        previous={
          state.previous && {
            text: operationText(state.previous),
            spoken: spokenOperation(state.previous),
          }
        }
        input={{ text: inputText(state), spoken: spokenInput(state) }}
        announcement={announcement(state)}
        error={state.error}
        busy={state.pending !== null}
      />
      <Keypad onPress={press} />
    </section>
  )
}
