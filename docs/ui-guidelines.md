# UI Guidelines for TODO App

## Purpose
This document defines the core UI standards for the TODO app so the experience stays consistent, accessible, and easy to use across all screens.

## Design Principles
- Keep interactions simple and focused on task completion.
- Prioritize readability over visual complexity.
- Use consistent spacing, typography, and component behavior.
- Ensure all primary actions are obvious and easy to reach.

## Component System
- Use Material UI (MUI) components as the default component library.
- Prefer built-in MUI components over custom controls whenever possible.
- Use `Container`, `Grid`, and `Stack` for layout.
- Use `Card` for grouped task content.
- Use `TextField`, `Checkbox`, `Select`, and `Button` for user input.
- Use `Dialog` for confirmations and destructive actions.
- Use `Snackbar` for temporary success and error feedback.

## Color Palette
Use the following palette consistently:

- Primary: `#0B5FFF` (action emphasis)
- Primary dark: `#0847C2` (hover/active state)
- Secondary: `#00A896` (supporting accents)
- Background: `#F7F9FC`
- Surface: `#FFFFFF`
- Text primary: `#1F2937`
- Text secondary: `#4B5563`
- Success: `#16A34A`
- Warning: `#D97706`
- Error: `#DC2626`
- Info: `#2563EB`

Rules:
- Keep contrast at or above WCAG AA thresholds.
- Do not use color as the only way to communicate status.
- Avoid introducing additional brand colors without team approval.

## Typography
- Font family: `"Roboto", "Helvetica", "Arial", sans-serif`.
- Base font size: `16px`.
- Body text line-height: `1.5` minimum.
- Heading scale:
  - H1: 32px
  - H2: 24px
  - H3: 20px
  - H4: 18px
- Maintain consistent heading hierarchy across pages.

## Spacing and Layout
- Use an 8px spacing system (`8, 16, 24, 32, 40, 48`).
- Minimum page padding:
  - Mobile: 16px
  - Tablet/Desktop: 24px
- Keep interactive controls at least 44x44px.
- Keep key actions visible without excessive scrolling.

## Buttons and Actions
- Use contained primary buttons for main actions (for example: Add Task, Save).
- Use outlined buttons for secondary actions.
- Use text buttons for low-emphasis actions.
- Destructive actions must be clearly labeled and use the error color.
- Button states required: default, hover, focus, disabled, loading.

## Forms and Input
- Every input must have a visible label.
- Include helper text for validation expectations when needed.
- Validate on blur and on submit.
- Show inline validation messages near the relevant field.
- Mark required fields clearly.

## Task List Behavior
- Each task item should include:
  - Completion checkbox
  - Task title
  - Optional due date
  - Edit action
  - Delete action
- Completed tasks should remain readable and visibly distinct.
- Sorting and filtering controls should be discoverable and keyboard accessible.

## States and Feedback
- Define and implement these states on each screen:
  - Loading
  - Empty
  - Success
  - Error
- Empty state should include short guidance and a clear call-to-action.
- Use non-blocking toast/snackbar feedback for successful operations.
- Use inline or dialog error messaging for failed operations.

## Accessibility Requirements
- Meet WCAG 2.1 AA minimum compliance.
- Full keyboard support is required for all interactive elements.
- Ensure visible focus indicators with sufficient contrast.
- Use semantic HTML and ARIA attributes only when needed.
- Ensure screen reader friendly labels for icon-only buttons.
- Respect reduced motion preferences where animations are present.

## Responsive Behavior
- Support mobile-first layout behavior.
- Recommended breakpoints:
  - xs: 0px+
  - sm: 600px+
  - md: 900px+
  - lg: 1200px+
- Ensure content reflows cleanly without horizontal scrolling.
- Navigation and filters should remain usable on small screens.

## Icons and Visual Language
- Use Material Icons consistently.
- Keep icon usage purposeful and paired with labels when needed.
- Avoid decorative imagery that distracts from task management.

## Motion and Transitions
- Use subtle transitions for component state changes.
- Keep animation durations between 120ms and 240ms.
- Avoid large or attention-heavy motion for frequent actions.

## Implementation Notes
- Centralize theme values in one shared theme configuration.
- Reuse UI primitives before introducing one-off styles.
- Document any approved exceptions to these guidelines.

## Acceptance Criteria for UI Work
A UI change is considered complete when:
- It uses shared MUI components and theme tokens.
- It meets accessibility and keyboard navigation requirements.
- It includes all required interaction states.
- It behaves correctly across mobile and desktop breakpoints.
- It passes visual and functional review against this document.
