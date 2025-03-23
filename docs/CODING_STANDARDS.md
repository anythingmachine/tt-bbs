# TT-BBS Coding Standards

This document outlines the coding standards and best practices for the TT-BBS project. Following these guidelines helps maintain code quality, readability, and consistency across the codebase.

## Table of Contents

1. [File Organization](#file-organization)
2. [Naming Conventions](#naming-conventions)
3. [Component Guidelines](#component-guidelines)
4. [State Management](#state-management)
5. [TypeScript Best Practices](#typescript-best-practices)
6. [Code Formatting](#code-formatting)
7. [Patterns and Anti-Patterns](#patterns-and-anti-patterns)
8. [Testing Guidelines](#testing-guidelines)

## File Organization

### Recommended Patterns

- Use feature-first organization
- Keep related code together (components, hooks, types, etc.)
- Create index.ts files to export public APIs from features
- Keep files under 500 lines of code

### Anti-Patterns

- Mixing unrelated code in the same file
- Deeply nested folder structures
- Files exceeding 500 lines of code
- Circular dependencies

## Naming Conventions

### Recommended Patterns

- **Components**: PascalCase (e.g., `TerminalDisplay.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useTerminalState.ts`)
- **Services**: camelCase with `Service` suffix (e.g., `terminalService.ts`)
- **Types/Interfaces**: PascalCase (e.g., `TerminalProps.ts`)
- **Utilities**: camelCase (e.g., `formatResponse.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_TERMINAL_WIDTH`)

### Anti-Patterns

- Inconsistent casing
- Non-descriptive or overly generic names
- Prefixing component files with "Component" (e.g., `ComponentTerminal.tsx`)

## Component Guidelines

### Recommended Patterns

- Write functional components with hooks
- Break large components into smaller, focused components
- Use composition for complex UI structures
- Export and document component props as interfaces
- Document component purpose with JSDoc comments

### Anti-Patterns

- Components with multiple responsibilities
- Deeply nested conditional rendering
- Inline styles (prefer CSS modules or Tailwind)
- Direct DOM manipulation
- Components exceeding 250 lines of code

## State Management

### Recommended Patterns

- Use React's built-in state management for simple state
- Leverage custom hooks for reusable state logic
- Use context for state that spans multiple components
- Keep state as close to where it's used as possible
- Consider state management libraries for complex applications

### Anti-Patterns

- Prop drilling more than 2 levels deep
- Over-using global state
- Storing derived state
- Large, monolithic context providers
- Unnecessary state (can be computed from props or other state)

## TypeScript Best Practices

### Recommended Patterns

- Use explicit types for function parameters and return values
- Create interfaces for complex objects
- Use union types for variables with multiple possible types
- Export type definitions for public APIs
- Use generics for reusable components and functions

### Anti-Patterns

- Overuse of `any` type
- Not validating API responses
- Type assertions without verification
- Complex, deeply nested types
- Non-descriptive generic type parameters

## Code Formatting

### Recommended Patterns

- Use Prettier for consistent formatting
- Use ESLint for code quality enforcement
- Document configuration choices
- Use consistent indentation (2 spaces)
- Limit line length (80-100 characters)

### Anti-Patterns

- Mixing different formatting styles
- Ignoring linter warnings
- Disabling ESLint rules without documentation
- Inconsistent whitespace or indentation

## Patterns and Anti-Patterns

### Recommended Patterns

- Early returns for guard clauses
- Destructuring for props and state
- Memoization for expensive calculations
- Error boundaries for graceful error handling
- Controlled components for form elements

### Anti-Patterns

- Deeply nested conditionals
- Side effects in render functions
- Event handler definitions inside render
- Direct API calls in components (use custom hooks or services)
- Multiple state updates that could be batched

## Testing Guidelines

### Recommended Patterns

- Write tests for all new features
- Focus on user-centric testing (behavior over implementation)
- Use meaningful test descriptions
- Isolate tests with proper mocking
- Test edge cases and error states

### Anti-Patterns

- Testing implementation details
- Brittle tests that break with minor changes
- Incomplete test coverage
- Overly complex test setups
- Redundant tests

## Maximum Complexity Guidelines

To maintain code quality, we enforce the following limits:

- Maximum file size: 500 lines
- Maximum function size: 50 lines
- Maximum cyclomatic complexity: 10
- Maximum nesting depth: 3 levels
- Maximum arguments per function: 5
