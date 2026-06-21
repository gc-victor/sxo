# ReactiveComponent Test Suite

This directory contains comprehensive tests for the ReactiveComponent library using Vitest with DOM support.

## Overview

The test suite provides thorough coverage of all core features and edge cases:

### Core Features

- State management and data flow
- DOM binding and event handling
- Computed properties and reactivity
- Effect system and lifecycle events
- Context API and state propagation
- Custom binding handlers
- Attribute and property management
- Value coercion and type handling

### Test Categories

- Basic functionality tests
- Edge case handling
- Error scenarios
- Integration tests
- Performance considerations
- Best practices validation

## Test Files Organization

- `bindings.test.ts` - Advanced binding scenarios
- `computed.test.ts` - Computed properties system
- `compute-implementation.test.ts` - Computed property implementation details
- `context.test.ts` - Context API core functionality
- `context-exposure.test.ts` - Context exposure and propagation
- `custom-binding.test.ts` - Custom binding handlers
- `dom-binding.test.ts` - DOM binding and event handling
- `effects.test.ts` - Effect system and reactivity
- `index.test.ts` - Core API and base functionality
- `lifecycle.test.ts` - Component lifecycle events
- `refs.test.ts` - Reference management
- `setup.ts` - Global test environment configuration
- `state.test.ts` - State management and updates
- `value-coercion.test.ts` - Type coercion and value handling

### Test Utilities

- `utils/test-helpers.ts` - Core testing utilities and helpers

## Running Tests

```sh
# Run all tests once
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage report
pnpm run test:coverage

# Run tests with coverage report in watch mode
pnpm run test:coverage:watch
```

## Test Patterns and Best Practices

1. Component Testing

   - Use `createComponent` helper for consistent setup
   - Clean up DOM elements after each test
   - Verify both initial state and updates
   - Test error conditions and edge cases

2. Asynchronous Testing

   - Use async/await for timing-dependent tests
   - Handle event propagation properly
   - Test component updates in correct order

3. State Management

   - Verify state initialization
   - Test state updates and propagation
   - Check computed property dependencies
   - Validate effect triggers and cleanup

4. DOM Interaction

   - Test event binding and handling
   - Verify attribute/property synchronization
   - Check custom binding behavior
   - Validate form input handling

5. Context Testing
   - Verify context propagation
   - Test multiple provider scenarios
   - Check context updates and subscriptions
   - Validate context cleanup

## Testing Utilities

1. Component Helpers

   - `createComponent<T>()` - Creates and mounts test components
   - `createFixture()` - Sets up DOM test fixtures
   - `TestReactiveComponent` - Base class for test components

2. Event Simulation

   - `simulateEvent()` - General event simulation
   - `simulateInput()` - Form input simulation
   - `simulateCheck()` - Checkbox input simulation

3. Console Utilities
   - `captureConsoleOutput()` - Console output capture

## Current coverage

| File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s |
| --------- | ------- | -------- | ------- | ------- | ----------------- |
| All files | 100     | 98.91    | 100     | 100     |                   |
| index.ts  | 100     | 98.91    | 100     | 100     | 566,848           |

## Special Considerations

1. Web Component Testing

   - Handle Custom Element registration
   - Manage component lifecycle properly
   - Clean up after disconnection
   - Handle shadow DOM when needed

2. State and Reactivity

   - Test state initialization timing
   - Verify update propagation order
   - Handle complex state dependencies
   - Test cleanup and memory management

3. Performance
   - Avoid unnecessary DOM operations
   - Clean up event listeners
   - Test memory leak scenarios
   - Validate update batching

## Contributing New Tests

1. File Organization

   - Place tests in appropriate category files
   - Use descriptive test group names
   - Follow existing file structure
   - Include both unit and integration tests

2. Test Structure

   - Use clear, descriptive test names
   - Follow Arrange-Act-Assert pattern
   - Include setup and cleanup code
   - Document complex test scenarios

3. Best Practices

   - Write atomic, focused tests
   - Avoid test interdependence
   - Use appropriate assertions
   - Include error case testing
   - Document complex test scenarios

4. Code Style
   - Follow existing naming conventions
   - Use typed test components
   - Maintain consistent formatting
   - Add helpful comments for complex logic

The test suite is designed to ensure reliability and maintainability of the ReactiveComponent library while providing clear examples for implementation patterns.
