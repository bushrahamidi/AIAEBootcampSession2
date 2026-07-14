# Coding Guidelines

This document defines the coding style and quality principles for this project. It exists to keep the codebase readable, maintainable, and consistent across both frontend and backend packages.

## Purpose and Mindset

Good code in this project should be easy to understand, safe to change, and straightforward to test. Clarity is preferred over cleverness. Team members should be able to open any file and quickly understand what it does, why it exists, and how to modify it without introducing regressions.

When writing code, optimize for long-term maintainability:

- Keep functions focused on one responsibility.
- Name variables and functions by intent, not by implementation detail.
- Prefer small, composable units over large, monolithic blocks.
- Leave the code cleaner than you found it when making changes.

## General Formatting Rules

Use consistent formatting so contributors can focus on behavior rather than style differences.

- Follow the repository formatter and linter defaults.
- Use consistent indentation and spacing throughout each file.
- Keep line lengths readable and avoid overly dense expressions.
- Use braces for control-flow statements for clarity and safety.
- Prefer single-purpose statements over chained logic that is hard to scan.

Additional readability guidance:

- Avoid deeply nested conditionals when guard clauses can simplify the flow.
- Group related logic into helper functions with clear names.
- Add brief comments only when intent is not obvious from the code itself.

## Import Organization

Imports should be predictable and easy to scan. Organize imports in stable groups and keep them sorted within each group.

Recommended import order:

1. Node.js built-in modules.
2. Third-party dependencies.
3. Internal workspace modules.
4. Relative imports from the same package.

Guidelines:

- Avoid unused imports.
- Prefer explicit named imports when they improve readability.
- Avoid circular dependencies across modules.
- Keep side-effect imports intentional and rare.

## Linter Usage and Static Quality Checks

Linting is required to enforce consistency and catch common defects early.

- Run lint checks before opening a pull request.
- Treat lint warnings as actionable items, not optional suggestions.
- Fix root causes instead of suppressing rules where possible.
- If a rule must be overridden, keep the override scoped and include a short justification.

Linting should work with testing, not against it:

- Keep test files consistent with the same style standards.
- Maintain deterministic assertions and avoid flaky patterns.

## DRY and Reuse Principles

Use the DRY (Don't Repeat Yourself) principle to reduce maintenance cost and prevent inconsistent behavior.

- Extract repeated logic into shared helpers or utility modules.
- Reuse domain rules in one place instead of duplicating validation logic.
- Consolidate duplicated UI patterns into reusable components.
- Avoid premature abstraction; duplicate once if needed, then refactor when repetition becomes clear.

A practical rule: abstract only when duplication is meaningful and the resulting abstraction remains easier to understand than the repeated code.

## Error Handling and Defensive Coding

Write code that fails clearly and predictably.

- Validate input at boundaries (API handlers, form submission, external integrations).
- Return consistent error structures from backend endpoints.
- Surface user-friendly error messages in the UI.
- Avoid swallowing exceptions silently.
- Add contextual logging for operational troubleshooting.

## Testing-Aligned Development

Coding quality and testing quality are linked. Changes should be structured for easy test coverage.

- Write logic in units that can be tested in isolation.
- Keep side effects (I/O, network calls) at boundaries.
- Update or add tests when behavior changes.
- Prefer behavior-focused tests over implementation-coupled assertions.

Refer to [testing-guidelines.md](./testing-guidelines.md) for detailed test expectations.

## Review and Pull Request Expectations

Before submitting code for review:

- Ensure lint and tests pass locally.
- Remove dead code, debugging output, and commented-out blocks.
- Keep pull requests focused on one logical change.
- Include clear descriptions of behavior changes and any trade-offs.

A change is considered complete when it is readable, lint-clean, tested, and aligned with these guidelines.

## Living Document

These guidelines are intended to evolve with the project. If the team adopts new tools, standards, or patterns, update this document so expectations remain explicit and shared.
