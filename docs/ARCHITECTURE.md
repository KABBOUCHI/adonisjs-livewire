# AdonisJS Livewire Architecture

## Overview

AdonisJS Livewire enables creating dynamic interfaces without writing JavaScript. Components are server-side classes that handle state and update the frontend reactively.

## Project Structure

```
src/
├── Core
│   ├── livewire.ts           # Main Livewire class
│   ├── component.ts          # Component class with mixins
│   ├── base_component.ts     # Base component functionality
│   └── component_context.ts  # Component execution context
│
├── Utilities
│   ├── checksum.ts          # Snapshot integrity
│   ├── event_bus.ts         # Event system
│   ├── store.ts             # State management
│   ├── form.ts              # Form handling with proxy
│   └── livewire_tag.ts      # HTML tags
│
├── View Layer
│   ├── view_component.ts    # View components
│   └── validation_error_tag.ts # ValidationError Edge tag
│
├── decorators/
│   └── index.ts             # Component decorators
│
├── features/                # Pluggable features
│   ├── support_computed/
│   ├── support_events/
│   ├── support_models/
│   └── ... (other features)
│
└── synthesizers/            # Data serialization
    ├── synth.ts             # Base synthesizer
    ├── array.ts             # Array serializer
    └── model.ts             # Model serializer
```

## Core Components

### Livewire Class (`livewire.ts`)
Main orchestrator that manages components, features, and synthesizers.

### Component Class (`component.ts`)
Combines multiple features using mixins. Each component has:
- Unique ID and name
- HTTP context
- View rendering capabilities

### Form Class (`form.ts`)
Handles form validation and state with VineJS schemas. Uses a proxy to:
- Track field changes
- Clear errors automatically  
- Manage validation state

### ValidationError Tag (`validation_error_tag.ts`)
Edge.js tag that displays validation errors from flash messages.

## Features System

Each feature extends component functionality:

- **support_computed**: Calculated properties
- **support_events**: Event listeners and emitters  
- **support_models**: Database model binding
- **support_lazy_loading**: Deferred component loading
- **support_query_string**: URL parameter synchronization
- **support_redirects**: Server-side redirects
- **support_decorators**: Annotation system

## Synthesizers

Convert complex data types for client-server transfer:

- **ArraySynth**: Array serialization
- **ModelSynth**: Database model serialization
- **Custom synthesizers**: For specific data types

## Data Flow

1. Browser sends request to component
2. Component hydrates from snapshot
3. Method executes with features
4. Component dehydrates to snapshot
5. Response sent to browser
