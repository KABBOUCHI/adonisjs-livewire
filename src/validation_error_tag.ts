import type {
  EdgeBufferContract,
  ParserContract,
  TagContract,
  TagTokenContract,
} from 'edge.js/types'

/**
 * ValidationError tag for displaying Livewire Form validation errors from flash messages
 *
 * Usage:
 * @validationError('fieldName')
 *   @each(error in $errors)
 *     <div class="error">{{ error.message }}</div>
 *   @end
 * @end
 *
 * @validationError('fieldName', 'required')
 *   <div class="error">{{ $message }}</div>
 * @end
 */
export default class ValidationErrorTag implements TagContract {
  tagName: string = 'validationError'
  block: boolean = true // This is a block tag (has @end)
  seekable: boolean = true

  compile(parser: ParserContract, buffer: EdgeBufferContract, token: TagTokenContract): void {
    const parsed = parser.utils.transformAst(
      parser.utils.generateAST(token.properties.jsArg, token.loc, token.filename),
      token.filename,
      parser
    )

    let fieldName: string
    let ruleFilter: string | null = null

    if (parsed.expressions && parsed.expressions.length > 0) {
      // Get field name (required)
      fieldName = parser.utils.stringify(parsed.expressions[0])

      // Get rule filter (optional)
      if (parsed.expressions[1]) {
        ruleFilter = parser.utils.stringify(parsed.expressions[1])
      }
    } else {
      // Single argument
      fieldName = parser.utils.stringify(parsed)
    }

    // Generate the condition to check if field has errors in flash messages
    // First check if validationErrorsBags exists, then check the specific field
    const condition = `state.flashMessages.has('validationErrorsBags') && !!state.flashMessages.get('validationErrorsBags')[${fieldName}]`

    // Write the if statement
    buffer.writeStatement(`if (${condition}) {`, token.filename, token.loc.start.line)

    if (ruleFilter) {
      // Filter by specific rule and provide $message directly
      buffer.writeExpression(
        `let $error = state.flashMessages.get('validationErrorsBags')[${fieldName}].find(err => err.rule === ${ruleFilter})`,
        token.filename,
        token.loc.start.line
      )

      // Create scope and define variable
      parser.stack.defineScope()
      parser.stack.defineVariable('$message')

      // Check if the specific rule error exists and extract message
      buffer.writeStatement(`if (!!$error) {`, token.filename, token.loc.start.line)
      buffer.writeExpression(`let $message = $error.message`, token.filename, token.loc.start.line)

      // Process component children
      token.children.forEach((child) => parser.processToken(child, buffer))

      // Close the rule check if statement
      buffer.writeStatement(`}`, token.filename, token.loc.start.line)

      // Clear scope
      parser.stack.clearScope()
    } else {
      // No rule filter - provide all errors as $errors array
      buffer.writeExpression(
        `let $errors = state.flashMessages.get('validationErrorsBags')[${fieldName}]`,
        token.filename,
        token.loc.start.line
      )

      // Create scope and define variable
      parser.stack.defineScope()
      parser.stack.defineVariable('$errors')

      // Process component children
      token.children.forEach((child) => parser.processToken(child, buffer))

      // Clear scope
      parser.stack.clearScope()
    }

    // Close the main if statement
    buffer.writeStatement(`}`, token.filename, token.loc.start.line)
  }
}
