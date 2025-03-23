# TT-BBS Application Structure

This README outlines the feature-first folder structure for the TT-BBS application.

## Feature-First Organization

Our codebase follows a feature-first organization pattern, where code is organized by features rather than by technical role. Each feature has its own directory containing all related components, hooks, utilities, and tests.

```
src/
├── app/                  # Next.js app router structure
│   ├── features/         # Features directory
│   │   ├── terminal/     # Terminal feature
│   │   │   ├── components/  # Terminal-specific components
│   │   │   ├── hooks/       # Terminal-specific hooks
│   │   │   ├── services/    # Terminal-specific services
│   │   │   ├── types/       # Terminal-specific type definitions
│   │   │   ├── utils/       # Terminal-specific utilities
│   │   │   └── index.ts     # Feature exports
│   │   ├── auth/         # Authentication feature
│   │   ├── bbs-apps/     # BBS Applications feature
│   │   └── ...           # Other features
│   ├── shared/           # Shared code used across features
│   │   ├── components/   # Shared components
│   │   ├── hooks/        # Shared hooks
│   │   ├── services/     # Shared services
│   │   ├── types/        # Shared type definitions
│   │   └── utils/        # Shared utilities
│   ├── api/              # API routes
│   ├── lib/              # Non-feature specific code (config, etc.)
│   ├── models/           # Database models
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Root page
│   └── globals.css       # Global styles
```

## Feature Structure Guidelines

Each feature should:

1. Be self-contained with all necessary components, hooks, services, and types
2. Export its public API through an `index.ts` file
3. Include comprehensive tests alongside the feature code
4. Not exceed 500 lines per file (split larger files into smaller components)
5. Follow the project's naming conventions

## Shared Code Guidelines

Code in the `shared` directory should:

1. Be used by multiple features
2. Be generic and reusable
3. Have clear and well-documented interfaces
4. Have comprehensive test coverage

## Importing Guidelines

Prefer importing from feature-level exports rather than directly from internal files:

```typescript
// Good
import { TerminalComponent } from '@/app/features/terminal';

// Avoid
import { TerminalComponent } from '@/app/features/terminal/components/TerminalComponent';
```

This allows for better encapsulation of feature internals and easier refactoring.
