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
    let expected = `@component('component', {})  @end`

    assert.equal(compile(input), expected)
  })

  test('opening and closing tag with props', async ({ assert }) => {
    let input = "<x-component foo='bar'></x-component>"
    let expected = `@component('component', {"foo":"bar"})  @end`

    assert.equal(compile(input), expected)
  })

  test('opening and closing tag with bound props', async ({ assert }) => {
    let input = "<x-component :foo='bar'></x-component>"
    let expected = `@component('component', {"foo":bar})  @end`

    assert.equal(compile(input), expected)
  })

  test('opening and closing tag with content', async ({ assert }) => {
    let input = '<x-component>foo</x-component>'
    let expected = `@component('component', {}) foo @end`

    assert.equal(compile(input), expected)
  })

  test('opening and closing tag with props and content', async ({ assert }) => {
    let input = "<x-component foo='bar'>foo</x-component>"
    let expected = `@component('component', {"foo":"bar"}) foo @end`

    assert.equal(compile(input), expected)
  })

  test('opening and closing tag with bound props and content', async ({ assert }) => {
    let input = "<x-component :foo='bar'>foo</x-component>"
    let expected = `@component('component', {"foo":bar}) foo @end`

    assert.equal(compile(input), expected)
  })

  test('nested #1', async ({ assert }) => {
    let input = '<x-foo><x-bar /></x-foo>'
    let expected = `@component('foo', {}) @!component('bar', {}) @end`

    assert.equal(compile(input), expected)
  })

  test('nested #2', async ({ assert }) => {
    let input = "<x-foo><x-bar bar1='bar2'></x-bar></x-foo>"
    let expected = `@component('foo', {}) @component('bar', {"bar1":"bar2"})  @end @end`

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
    let expected = `@component('foo', {}) 
    @component('bar', {}) 
        @component('baz', {}) 
            @!component('qux', {"a":"b"})
         @end
     @end
 @end`

    assert.equal(compile(input), expected)
  })

  test('self closing with flag', async ({ assert }) => {
    let input = "<x-component a='b' lazy />"
    let expected = `@!component('component', {"a":"b","lazy":true})`

    assert.equal(compile(input), expected)
  })

  test('opening and closing with flag', async ({ assert }) => {
    let input = "<x-component a='b' lazy></x-component>"
    let expected = `@component('component', {"a":"b","lazy":true})  @end`

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
})
