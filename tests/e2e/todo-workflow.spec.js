const { test, expect } = require('@playwright/test');
const { TodoPage } = require('./pages/TodoPage');
const { clearAllTodos, createTodo } = require('./support/todoApi');

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

test.describe('Todo Critical Journeys', () => {
  test.beforeEach(async ({ page, request }) => {
    await clearAllTodos(request);
    const todoPage = new TodoPage(page);
    await todoPage.goto();
  });

  test('creates a task with details', async ({ page }) => {
    const todoPage = new TodoPage(page);
    await todoPage.addTask({
      title: 'E2E create task',
      description: 'Created from Playwright critical path',
      dueDate: formatLocalDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    });

    await todoPage.expectTaskVisible('E2E create task');
  });

  test('edits an existing task title', async ({ page, request }) => {
    await createTodo(request, { title: 'E2E edit source', priority: 'medium' });

    const todoPage = new TodoPage(page);
    await page.reload();
    await todoPage.expectTaskVisible('E2E edit source');

    await todoPage.editTaskTitle('E2E edit source', 'E2E edit result');
    await todoPage.expectTaskVisible('E2E edit result');
    await todoPage.expectTaskNotVisible('E2E edit source');
  });

  test('toggles completion and clears completed tasks', async ({ page, request }) => {
    await createTodo(request, { title: 'E2E clear completed target', priority: 'high' });

    const todoPage = new TodoPage(page);
    await page.reload();
    await todoPage.toggleTask('E2E clear completed target');
    await todoPage.clearCompletedTasks();

    await todoPage.expectTaskNotVisible('E2E clear completed target');
  });

  test('searches and filters by status', async ({ page, request }) => {
    await createTodo(request, { title: 'Sprint retrospective', description: 'Search me' });
    await createTodo(request, { title: 'Release checklist', description: 'Do not match search' });

    const todoPage = new TodoPage(page);
    await page.reload();

    await todoPage.search('retro');
    await todoPage.expectTaskVisible('Sprint retrospective');
    await todoPage.expectTaskNotVisible('Release checklist');

    await todoPage.toggleTask('Sprint retrospective');
    await todoPage.search('');
    await todoPage.chooseSelectOption('Status', 'Completed');
    await todoPage.expectTaskVisible('Sprint retrospective');
  });

  test('filters overdue tasks and shows overdue indicator', async ({ page, request }) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await createTodo(request, {
      title: 'Past due item',
      dueDate: formatLocalDate(yesterday),
      priority: 'medium',
    });

    const todoPage = new TodoPage(page);
    await page.reload();
    await todoPage.expectOverdueVisible();

    await todoPage.chooseSelectOption('Due date', 'Overdue');
    await todoPage.expectTaskVisible('Past due item');
  });

  test('sorts tasks by priority ascending', async ({ page, request }) => {
    await createTodo(request, { title: 'Low priority task', priority: 'low' });
    await createTodo(request, { title: 'High priority task', priority: 'high' });

    const todoPage = new TodoPage(page);
    await page.reload();

    await todoPage.chooseSelectOption('Sort by', 'Priority');
    await todoPage.chooseSelectOption('Sort order', 'Ascending');

    const titles = await todoPage.visibleTaskTitles();
    const highIndex = titles.indexOf('High priority task');
    const lowIndex = titles.indexOf('Low priority task');

    expect(highIndex).toBeGreaterThanOrEqual(0);
    expect(lowIndex).toBeGreaterThanOrEqual(0);
    expect(highIndex).toBeLessThan(lowIndex);
  });
});
