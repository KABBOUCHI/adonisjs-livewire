import { test } from '@japa/runner'
import { ComponentTagCompiler } from '../../src/component_tag_compiler.js'

const compile = (input: string) => ComponentTagCompiler.compile(input)

test.group('x-tag', () => {
  test('self closing tag', async ({ assert }) => {
    let input = '<x-component />'
    let expected = "@!component('component', {})"

    assert.equal(compile(input), expected)
  })

  test('self closing tag with props', async ({ assert }) => {
    let input = "<x-component foo='bar' />"
    let expected = `@!component('component', {"foo":"bar"})`

    assert.equal(compile(input), expected)
  })

  test('self closing tag with bound props', async ({ assert }) => {
    let input = "<x-component :foo='bar' />"
    let expected = `@!component('component', {"foo":bar})`

    assert.equal(compile(input), expected)
  })

  test('opening and closing tag', async ({ assert }) => {
    let input = '<x-component></x-component>'
    let expected = `@component('component', {})\n\n@end`

    assert.equal(compile(input), expected)
  })

  test('opening and closing tag with props', async ({ assert }) => {
    let input = "<x-component foo='bar'></x-component>"
    let expected = `@component('component', {"foo":"bar"})\n\n@end`

    assert.equal(compile(input), expected)
  })

  test('opening and closing tag with bound props', async ({ assert }) => {
    let input = "<x-component :foo='bar'></x-component>"
    let expected = `@component('component', {"foo":bar})\n\n@end`

    assert.equal(compile(input), expected)
  })

  test('opening and closing tag with content', async ({ assert }) => {
    let input = '<x-component>foo</x-component>'
    let expected = `@component('component', {})\nfoo\n@end`

    assert.equal(compile(input), expected)
  })

  test('opening and closing tag with props and content', async ({ assert }) => {
    let input = "<x-component foo='bar'>foo</x-component>"
    let expected = `@component('component', {"foo":"bar"})\nfoo\n@end`

    assert.equal(compile(input), expected)
  })

  test('opening and closing tag with bound props and content', async ({ assert }) => {
    let input = "<x-component :foo='bar'>foo</x-component>"
    let expected = `@component('component', {"foo":bar})\nfoo\n@end`

    assert.equal(compile(input), expected)
  })

  test('nested #1', async ({ assert }) => {
    let input = '<x-foo><x-bar /></x-foo>'
    let expected = `@component('foo', {})\n@!component('bar', {})\n@end`

    assert.equal(compile(input), expected)
  })

  test('nested #2', async ({ assert }) => {
    let input = "<x-foo><x-bar bar1='bar2'></x-bar></x-foo>"
    let expected = `@component('foo', {})\n@component('bar', {"bar1":"bar2"})\n\n@end\n@end`

    assert.equal(compile(input), expected)
  })

  test('nested deep', async ({ assert }) => {
    let input = `<x-foo>
    <x-bar>
        <x-baz>
            <x-qux a="b" />
        </x-baz>
    </x-bar>
</x-foo>`
    let expected =
      "@component('foo', {})\n" +
      '\n' +
      "    @component('bar', {})\n" +
      '\n' +
      "        @component('baz', {})\n" +
      '\n' +
      `            @!component('qux', {"a":"b"})\n` +
      '        \n' +
      '@end\n' +
      '    \n' +
      '@end\n' +
      '\n' +
      '@end'

    assert.equal(compile(input), expected)
  })

  test('self closing with flag', async ({ assert }) => {
    let input = "<x-component a='b' lazy />"
    let expected = `@!component('component', {"a":"b","lazy":true})`

    assert.equal(compile(input), expected)
  })

  test('opening and closing with flag', async ({ assert }) => {
    let input = "<x-component a='b' lazy></x-component>"
    let expected = `@component('component', {"a":"b","lazy":true})\n\n@end`

    assert.equal(compile(input), expected)
  })

  test('livewire model', async ({ assert }) => {
    let input = "<x-component wire:model='foo' />"
    let expected = `@!component('component', {"wire:model":"foo"})`

    assert.equal(compile(input), expected)
  })

  test('livewire model live', async ({ assert }) => {
    let input = "<x-component wire:model.live='foo' />"
    let expected = `@!component('component', {"wire:model.live":"foo"})`

    assert.equal(compile(input), expected)
  })

  test('curly braces in props - self closed', async ({ assert }) => {
    let input = "<x-component foo='{{ bar }}' />"
    let expected = `@!component('component', {"foo":\`\${bar }\`})`

    assert.equal(compile(input), expected)
  })

  test('curly braces in props', async ({ assert }) => {
    let input = "<x-component foo='{{ bar }}'></x-component>"
    let expected = `@component('component', {"foo":\`\${bar }\`})\n\n@end`

    assert.equal(compile(input), expected)

    let input2 = "<x-component foo='abc {{ bar }}'></x-component>"
    let expected2 = `@component('component', {"foo":\`abc \${bar }\`})\n\n@end`

    assert.equal(compile(input2), expected2)
  })

  test('curly braces in props #2', async ({ assert }) => {
    let input = `<x-button wire:click="clickMe('{{ abc }}')"></x-button>`
    let expected = `@component('button', {"wire:click":\`clickMe(\'\${abc }\')\`})\n\n@end`

    assert.equal(compile(input), expected)

    let input2 = `<x-button wire:click="clickMe('{{ abc }}')" />`
    let expected2 = `@!component('button', {"wire:click":\`clickMe(\'\${abc }\')\`})`

    assert.equal(compile(input2), expected2)
  })

  test('slot', async ({ assert }) => {
    let input = "<x-slot name='header'></x-slot>"
    let expected = `@slot("header")\n\n@endslot`

    assert.equal(compile(input), expected)
  })

  test('slot - dyamic prop', async ({ assert }) => {
    let input = "<x-slot name='{{ foo }}'></x-slot>"
    let expected = `@slot(\`\${foo }\`)\n\n@endslot`

    assert.equal(compile(input), expected)

    let input2 = "<x-slot :name='bar'></x-slot>"
    let expected2 = `@slot(bar)\n\n@endslot`

    assert.equal(compile(input2), expected2)

    let input3 = "<x-slot :name='bar' props='{ a, b, c }'></x-slot>"
    let expected3 = `@slot(bar, { a, b, c })\n\n@endslot`

    assert.equal(compile(input3), expected3)

    let input4 = "<x-slot :name='bar' props='myProps'></x-slot>"
    let expected4 = `@slot(bar, myProps)\n\n@endslot`

    assert.equal(compile(input4), expected4)
  })

  test('disks - self closed', async ({ assert }) => {
    let input = '<x-diskName::button />'
    let expected = `@!component('diskName::button', {})`
    assert.equal(compile(input), expected)
  })

  test('disks', async ({ assert }) => {
    let input = '<x-diskName::button> Test </x-diskName::button>'
    let expected = `@component('diskName::button', {})\n Test \n@end`
    assert.equal(compile(input), expected)
  })
})
