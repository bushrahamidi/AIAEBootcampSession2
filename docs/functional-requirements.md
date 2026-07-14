# Functional Requirements

This document defines the core functional requirements for the TODO app.

## Task Creation

1. The user can create a new task with a required title.
2. The user can optionally add a task description.
3. The user can optionally assign a due date to a task.
4. The user can optionally assign a priority level (low, medium, high) to a task.

## Task Viewing and Organization

1. The user can view all tasks in a single list.
2. The user can view active and completed tasks separately.
3. The user can sort tasks by due date, priority, or creation date.
4. The app shows overdue tasks clearly.

## Task Editing and Completion

1. The user can edit a task title, description, due date, and priority after creation.
2. The user can mark a task as completed.
3. The user can mark a completed task back to active.
4. The app records completion status per task.

## Task Deletion

1. The user can delete a single task.
2. The user can clear all completed tasks at once.

## Search and Filtering

1. The user can search tasks by title and description text.
2. The user can filter tasks by status (all, active, completed).
3. The user can filter tasks by due date range (today, this week, overdue).
4. The user can filter tasks by priority.

## Persistence

1. Task data persists between sessions.
2. On reload, the app restores all saved tasks with their full state.

## Validation and Feedback

1. The app prevents creating a task with an empty title.
2. The app validates due dates and rejects invalid date input.
3. The app provides clear feedback after create, edit, complete, and delete actions.
4. The app confirms destructive bulk actions such as clearing completed tasks.
