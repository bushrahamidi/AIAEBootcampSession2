const { test, expect } = require('@playwright/test');

class TodoPage {
  constructor(page) {
    this.page = page;
    this.titleInput = page.getByRole('textbox', { name: 'Task title' });
    this.descriptionInput = page.getByRole('textbox', { name: 'Description' });
    this.addButton = page.getByRole('button', { name: 'Add task' });
  }

  async goto() {
    await this.page.goto('/');
  }

  async addTask(title, description) {
    await this.titleInput.fill(title);
    if (description) {
      await this.descriptionInput.fill(description);
    }
    await this.addButton.click();
  }

  taskHeading(title) {
    return this.page.getByRole('heading', { name: title });
  }
}

test('user can add a todo task', async ({ page }) => {
  const todoPage = new TodoPage(page);

  await todoPage.goto();
  await todoPage.addTask('Playwright todo', 'Created by E2E test');

  await expect(todoPage.taskHeading('Playwright todo')).toBeVisible();
});
