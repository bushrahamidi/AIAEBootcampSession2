# Testing Guidelines

This document defines the testing principles and conventions for this project.

## Core Testing Principles

- All new features must include appropriate automated tests.
- Tests must be maintainable, readable, and follow best practices.
- All tests must be isolated and independent.
- Each test must set up its own data and state and must not rely on test execution order.
- Setup and teardown hooks are required where appropriate so tests pass consistently across multiple runs.

## Unit Tests

- **Framework**: Use Jest to test individual functions and React components in isolation.
- **File naming**: Use `*.test.js` or `*.test.ts`.
- **Backend location**: `packages/backend/__tests__/`
- **Frontend location**: `packages/frontend/src/__tests__/`
- **Naming convention**: Name unit test files to match what they test.
  - Example: `app.test.js` for `app.js`

## Integration Tests

- **Framework**: Use Jest + Supertest to test backend API endpoints with real HTTP requests.
- **Location**: `packages/backend/__tests__/integration/`
- **File naming**: Use `*.test.js` or `*.test.ts`.
- **Naming convention**: Name integration tests based on the feature or endpoint group they validate.
  - Example: `todos-api.test.js` for TODO API endpoints

## End-to-End (E2E) Tests

- **Framework**: Use Playwright (required) to test complete UI workflows through browser automation.
- **Location**: `tests/e2e/`
- **File naming**: Use `*.spec.js` or `*.spec.ts`.
- **Naming convention**: Name E2E test files based on the user journey.
  - Example: `todo-workflow.spec.js`
- **Browser policy**: Playwright tests must use one browser only.
- **Architecture**: Playwright tests must use the Page Object Model (POM) pattern for maintainability.
- **Coverage scope**: Limit E2E tests to 5-8 critical user journeys focused on happy paths and key edge cases.

## Port Configuration for Testing and CI/CD

Use environment variables with sensible defaults so local development and CI/CD environments can configure ports dynamically.

- **Backend**:

```js
const PORT = process.env.PORT || 3030;
```

- **Frontend**:
  - React default development port is `3000`.
  - The frontend port can be overridden with the `PORT` environment variable.

This approach allows CI/CD workflows and test runners to dynamically detect and assign ports.

## Quality Expectations

- Prefer deterministic assertions over timing-sensitive checks.
- Keep tests focused on behavior, not implementation details.
- Use reusable test utilities and fixtures to reduce duplication.
- Update tests when behavior changes; avoid stale or misleading test coverage.
