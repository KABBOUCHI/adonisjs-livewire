import { test } from '@japa/runner'
import { Component } from '../src/component.js'

test.group('Basic', () => {
  test('should be able to test Livewire', async ({ livewire }) => {
    class CreatePost extends Component {
      public title = ''

      async create() {
        this.title = ''
      }

      async render() {
        return `<form wire:submit.prevent="create">
            <input wire:model="title" type="text">

            <button>Create Post</button>
        </form>`
      }
    }

    const testable = livewire.test(CreatePost)
    testable.set('title', 'foo').assertSet('title', 'foo')
    await testable.call('create')
    testable.assertSet('title', '')
  })

  test('should support setting multiple properties', async ({ livewire }) => {
    class UserForm extends Component {
      public name = ''
      public email = ''
      public age = 0

      async render() {
        return `<div></div>`
      }
    }

    livewire
      .test(UserForm)
      .set({ name: 'John', email: 'john@example.com', age: 25 })
      .assertSet('name', 'John')
      .assertSet('email', 'john@example.com')
      .assertSet('age', 25)
  })

  test('should support toggle', async ({ livewire }) => {
    class ToggleComponent extends Component {
      public isActive = false

      async render() {
        return `<div></div>`
      }
    }

    livewire
      .test(ToggleComponent)
      .assertSet('isActive', false)
      .toggle('isActive')
      .assertSet('isActive', true)
      .toggle('isActive')
      .assertSet('isActive', false)
  })

  test('should support assertNotSet', async ({ livewire }) => {
    class Counter extends Component {
      public count = 0

      async render() {
        return `<div></div>`
      }
    }

    livewire
      .test(Counter)
      .set('count', 5)
      .assertNotSet('count', 0)
      .assertNotSet('count', 10)
      .assertSet('count', 5)
  })

  test('should support assertCount', async ({ livewire }) => {
    class ListComponent extends Component {
      public items: string[] = []

      addItem(item: string) {
        this.items.push(item)
      }

      async render() {
        return `<div></div>`
      }
    }

    const testable = livewire.test(ListComponent)
    testable.assertCount('items', 0)
    await testable.call('addItem', 'first')
    testable.assertCount('items', 1)
    await testable.call('addItem', 'second')
    testable.assertCount('items', 2)
  })

  test('should support calling methods with parameters', async ({ livewire }) => {
    class Calculator extends Component {
      public result = 0

      add(a: number, b: number) {
        this.result = a + b
      }

      multiply(a: number, b: number) {
        this.result = a * b
      }

      async render() {
        return `<div></div>`
      }
    }

    const testable = livewire.test(Calculator)
    testable.assertSet('result', 0)
    await testable.call('add', 5, 3)
    testable.assertSet('result', 8)
    await testable.call('multiply', 4, 7)
    testable.assertSet('result', 28)
  })

  test('should support passing initial params', async ({ livewire }) => {
    class Greeting extends Component {
      public name = 'World'
      public prefix = 'Hello'

      async render() {
        return `<div></div>`
      }
    }

    livewire
      .test(Greeting, { name: 'Alice', prefix: 'Hi' })
      .assertSet('name', 'Alice')
      .assertSet('prefix', 'Hi')
  })

  test('should support withQueryParams', async ({ livewire }) => {
    class SearchComponent extends Component {
      public query = ''
      public page = 1

      async render() {
        return `<div></div>`
      }
    }

    livewire
      .withQueryParams({ query: 'test', page: 2 })
      .test(SearchComponent)
      .assertSet('query', 'test')
      .assertSet('page', 2)
  })

  test('should support callback assertion in assertSet', async ({ livewire }) => {
    class DataComponent extends Component {
      public items = ['a', 'b', 'c']

      async render() {
        return `<div></div>`
      }
    }

    livewire
      .test(DataComponent)
      .assertSet('items', (value: string[]) => value.length === 3)
      .assertSet('items', (value: string[]) => value.includes('b'))
  })

  test('should support strict assertion', async ({ livewire }) => {
    class TypeComponent extends Component {
      public value: number | string = 1

      async render() {
        return `<div></div>`
      }
    }

    livewire.test(TypeComponent).assertSet('value', '1', false).assertSet('value', 1, true)
  })

  test('should support assertNoRedirect', async ({ livewire }) => {
    class SimpleComponent extends Component {
      public data = ''

      doSomething() {
        this.data = 'done'
      }

      async render() {
        return `<div></div>`
      }
    }

    const testable = livewire.test(SimpleComponent)
    await testable.call('doSomething')
    testable.assertNoRedirect().assertSet('data', 'done')
  })

  test('should support assertHasNoErrors when no errors', async ({ livewire }) => {
    class FormComponent extends Component {
      public email = ''

      submit() {
        this.email = 'submitted'
      }

      async render() {
        return `<div></div>`
      }
    }

    const testable = livewire.test(FormComponent)
    await testable.call('submit')
    testable.assertHasNoErrors().assertHasNoErrors('email').assertHasNoErrors(['email'])
  })

  test('should support assertSetStrict', async ({ livewire }) => {
    class StrictComponent extends Component {
      public name = 'foo'

      async render() {
        return `<div></div>`
      }
    }

    livewire
      .test(StrictComponent)
      .set('name', '')
      .assertSetStrict('name', '')
      .set('name', 0)
      .assertSetStrict('name', 0)
  })

  test('should support assertNotSetStrict', async ({ livewire }) => {
    class StrictComponent extends Component {
      public name: string | number = 'bar'

      async render() {
        return `<div></div>`
      }
    }

    livewire.test(StrictComponent).set('name', '').assertNotSetStrict('name', null)
  })

  test('should support assertReturned', async ({ livewire }) => {
    class ReturnsDataComponent extends Component {
      foo() {
        return 'bar'
      }

      getNumber() {
        return 42
      }

      async render() {
        return `<div></div>`
      }
    }

    const testable = livewire.test(ReturnsDataComponent)
    await testable.call('foo')
    testable.assertReturned('bar')
    await testable.call('getNumber')
    testable.assertReturned(42).assertReturned((data: number) => data === 42)
  })

  test('should support assertNotSet with strict mode', async ({ livewire }) => {
    class TypeCoercionComponent extends Component {
      public value: number | string = 100

      async render() {
        return `<div></div>`
      }
    }

    livewire
      .test(TypeCoercionComponent)
      .assertNotSet('value', '1e2', true)
      .set('value', 0)
      .assertNotSet('value', false, true)
      .assertNotSet('value', null, true)
  })

  test('should support dispatching events', async ({ livewire }) => {
    class EventComponent extends Component {
      dispatchFoo() {
        this.dispatch('foo', {})
      }

      dispatchFooWithParam(param: string) {
        this.dispatch('foo', { param })
      }

      dispatchToComponent() {
        this.dispatch('bar', {}, 'other-component')
      }

      async render() {
        return `<div></div>`
      }
    }

    const testable = livewire.test(EventComponent)
    testable.assertNotDispatched('foo')
  })

  test('should support multiple set calls chained', async ({ livewire }) => {
    class MultiSetComponent extends Component {
      public a = ''
      public b = ''
      public c = ''

      async render() {
        return `<div></div>`
      }
    }

    livewire
      .test(MultiSetComponent)
      .set('a', '1')
      .set('b', '2')
      .set('c', '3')
      .assertSet('a', '1')
      .assertSet('b', '2')
      .assertSet('c', '3')
  })

  test('should support assertCount with adding and removing items', async ({ livewire }) => {
    class TodoListComponent extends Component {
      public todos: string[] = []

      addTodo(todo: string) {
        this.todos.push(todo)
      }

      removeTodo(index: number) {
        this.todos.splice(index, 1)
      }

      clearTodos() {
        this.todos = []
      }

      async render() {
        return `<div></div>`
      }
    }

    const testable = livewire.test(TodoListComponent)
    testable.assertCount('todos', 0)
    await testable.call('addTodo', 'Buy milk')
    testable.assertCount('todos', 1)
    await testable.call('addTodo', 'Walk the dog')
    testable.assertCount('todos', 2)
    await testable.call('addTodo', 'Do laundry')
    testable.assertCount('todos', 3)
    await testable.call('removeTodo', 0)
    testable.assertCount('todos', 2)
    await testable.call('clearTodos')
    testable.assertCount('todos', 0)
  })

  test('should support complex object properties', async ({ livewire }) => {
    class ObjectComponent extends Component {
      public user = { name: '', email: '', age: 0 }

      updateUser(name: string, email: string, age: number) {
        this.user = { name, email, age }
      }

      async render() {
        return `<div></div>`
      }
    }

    const testable = livewire.test(ObjectComponent)
    await testable.call('updateUser', 'John', 'john@test.com', 30)
    testable.assertSet(
      'user',
      (user: any) => user.name === 'John' && user.email === 'john@test.com' && user.age === 30
    )
  })

  test('should support boolean toggle multiple times', async ({ livewire }) => {
    class MultiToggleComponent extends Component {
      public a = false
      public b = true
      public c = false

      async render() {
        return `<div></div>`
      }
    }

    livewire
      .test(MultiToggleComponent)
      .assertSet('a', false)
      .assertSet('b', true)
      .assertSet('c', false)
      .toggle('a')
      .toggle('b')
      .toggle('c')
      .assertSet('a', true)
      .assertSet('b', false)
      .assertSet('c', true)
  })
})
