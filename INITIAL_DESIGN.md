We want a calculator app. Right now we have an empty skeleton for a React with Typescript frontend and a Go REST backend.

Calculator characteristics:
- It should be a simple binary calculator: It only holds two operands and an operator.
- The basic flow is that you input a number, then an operator, and then another number. All of this is visible as it's being entered. At that point if you enter `=` the result gets displayed and remains there. Above the result in a smaller font size we'll show the operation that led to it, followed by a `=`, for example, `5 x 2 =`.
- If you already have two operands and an operator and enter another operator, the input display will be updated to the result of the operation that was there, followed by the new operand. For example, you have: `12 x 2`, enter `+`, the input changes to `24 +`. As expected, above that you will have the operation that led to it (`12 x 2 =`).
- An exception to the above 'new operator leads to result' rule is with the negative sign (`-`). If you already have an operand and an operator, such as `10 +`, if you enter the negative sign it will be taken as the sign of the next operand, for example `10 + -`, which could then become `10 + -5` with more input.
- Entering `=` after a result repeats applying the last operator and second operand to the latest result. If we had done `10 + 1` and got `11`, entering `=` multiple times consecutively would get us to `12`, `13`, `14`, and so on because we're repating the `+ 1`.
- Accepted operators: addition (`+`), subtraction (`-`), multiplication (`x`), division (`÷`), exponentiation (`^`). Note that all are binary operators (they take in two operands).
- Use scientific notation (e.g. `3e+12`) for numbers starting from `1e+10` for 'big' numbers and `1e-10` for 'small' ones.
- Allow the use of a decimal point (`.`). If there's already a decimal point, for example `12.3`, ignore further attempts to enter another decimal point. If there's no operand for the current spot that's about to be entered, the user can input a decimal point to go to `0.`, for example empty (no input) to `0.` or `5 +` to `5 + 0.`.
- When an invalid operation is attempted (e.g. division by 0), display a temporary message saying what the error was (e.g. `Invalid: Division by 0`), and keep the input state as it was.
- There should also be a limit against extremely big or extremely small numbers. This applies both to input operands and to operation results.
- Include a delete (remove a single symbol) and a clear button.

Frontend characteristics:
-  Buttons can be clicked via the UI or typed in.
- Don't allow the user to type in more digits beyond a certain size. This is to avoid them wasting time entering a huge number of digits which will not be able to be handled by the backend anyways.
- The design should be responsive, but it's fine if we just handle two cases: standard mobile and standard desktop size.
- Take accesibility into account.

Backend characteristics:
- We will have a separate endpoint per operator.
- Invalid operations are handled at this level.
- Endpoints return data to determine whether the operation was successful or not, what the new value for the input display should be, what the 'previous operation' was, and what the error message (if the operation failed) was. I specifically say 'return data to determine' because we don't want to simply return data in a way that's tightly coupled to this specific frontend design. For example, we don't want to straight up return a `previous_operation_text: 10 x 5 =`, but we do want the data that would allow the frontend (or any other client) to easily construct that.
- Numbers are returned as plain, machine-readable values, not formatted display strings. Presentation, including scientific notation, is up to each client.
- Data is returned in JSON format for the frontend to consume.
