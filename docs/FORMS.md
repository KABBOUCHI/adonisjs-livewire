# Livewire Forms

## Overview

The Form system provides reactive form handling with automatic validation, error management, and state persistence using VineJS schemas and intelligent proxies.

## Core Components

### FormStore Class
Internal state manager that handles:
- Field values and defaults
- Validation errors
- Field initialization tracking
- Flash message integration

### Form Proxy
Smart proxy that intercepts field access to:
- Track field changes
- Clear errors automatically
- Provide default values
- Handle JavaScript compatibility

## Basic Usage

```typescript
import User from '#models/user'
import vine from '@vinejs/vine'
import { Component, Form, layout, Mixin, title } from 'adonisjs-livewire'

const schema = vine.object({
  email: vine.string().email().normalizeEmail(),
  password: vine.string().minLength(6),
  remember: vine.accepted().optional(),
})

class LoginForm extends Form(schema) {
  async login() {
    const { email, password, remember } = await this.validate()
    
    const user = await User.verifyCredentials(email, password)
    await this.ctx.auth.use('web').login(user, remember)

    this.redirect('/', true)
  }
}

@title('Login')
@layout('components/layouts/empty')
export default class LoginPage extends Mixin(Component, LoginForm) {
  async mount() {
    this.defaults({
      email: 'johndoe@example.com',
      password: 'secret',
      remember: true,
    })
  }

  async render() {
    return this.view.render('livewire/login')
  }
}
```

## Form Methods

### `defaults(values)`
Set default values for form fields.

### `validate(field?)`
Validate entire form or specific field. Returns validated data or throws validation errors.

### `resetAndClearErrors()`
Reset form to default values and clear all errors.

### `isFieldInitialized(field)`
Check if a field has been modified by user.

## Validation Integration

### Automatic Error Handling
- Errors are stored in flash messages (`validationErrorsBags`)
- Errors are cleared when fields are corrected
- Field-specific error tracking

### ValidationError Edge Tag
Display validation errors in templates:

```edge
@validationError('email')
  @each(error in $errors)
    <div class="error">{{ error.message }}</div>
  @end
@end
```

## Proxy Features

The form proxy automatically handles:
- Field initialization tracking
- Error clearing on field change
- Default value fallbacks
- Symbol and property compatibility
- JavaScript property access

## Flash Message Structure

```typescript
// Flash messages format
validationErrorsBags: {
  [fieldName]: [
    { rule: 'required', message: 'Field is required' },
    { rule: 'email', message: 'Must be valid email' }
  ]
}
```