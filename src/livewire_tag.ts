import type {
  EdgeBufferContract,
  ParserContract,
  TagContract,
  TagTokenContract,
} from 'edge.js/types'

export default class LivewireTag implements TagContract {
  tagName: string = 'livewire'
  block: boolean = false
  seekable: boolean = true
  compile(parser: ParserContract, buffer: EdgeBufferContract, token: TagTokenContract): void {
    const parsed = parser.utils.transformAst(
      parser.utils.generateAST(token.properties.jsArg, token.loc, token.filename),
      token.filename,
      parser
    )

    if (parsed.expressions) {
      const componentClass = parser.utils.stringify(parsed.expressions[0])
      const componentParams = parsed.expressions[1]
        ? parser.utils.stringify(parsed.expressions[1])
        : '[]'
      const componentOptions = parsed.expressions[2]
        ? parser.utils.stringify(parsed.expressions[2])
        : '{}'
      buffer.outputExpression(
        `await state.livewire.mount(${componentClass}, ${componentParams}, ${componentOptions})`,
        token.filename,
        token.loc.start.line,
        false
      )
    } else {
      const componentClass = parser.utils.stringify(parsed)
      buffer.outputExpression(
        `await state.livewire.mount(${componentClass})`,
        token.filename,
        token.loc.start.line,
        false
      )
    }
  }
}
