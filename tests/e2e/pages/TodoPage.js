const { expect } = require('@playwright/test');

class TodoPage {
  constructor(page) {
    this.page = page;
    this.titleInput = page.getByRole('textbox', { name: 'Task title' }).first();
    this.descriptionInput = page.getByRole('textbox', { name: 'Description' }).first();
    this.dueDateInput = page.getByLabel('Due date').first();
    this.addTaskButton = page.getByRole('button', { name: 'Add task' });
    this.searchInput = page.getByRole('textbox', { name: 'Search tasks' });
    this.clearCompletedButton = page.getByRole('button', { name: 'Clear completed', exact: true });
  }

  async goto() {
    await this.page.goto('/');
    await expect(this.page.getByRole('heading', { name: 'Todo Flow' })).toBeVisible();
  }

  async addTask({ title, description = '', dueDate = '' }) {
    await this.titleInput.fill(title);

    if (description) {
      await this.descriptionInput.fill(description);
    }

    if (dueDate) {
      await this.dueDateInput.fill(dueDate);
    }

    await this.addTaskButton.click();
  }

  async editTaskTitle(currentTitle, nextTitle) {
    await this.page.getByRole('button', { name: `Edit ${currentTitle}` }).click();

    const editTitleInput = this.page.getByRole('textbox', { name: 'Task title' }).nth(1);
    await editTitleInput.clear();
    await editTitleInput.fill(nextTitle);

    await this.page.getByRole('button', { name: `Save ${currentTitle}` }).click();
  }

  async toggleTask(title) {
    await this.page.getByRole('checkbox', { name: `Toggle completion for ${title}` }).click();
  }

  async deleteTask(title) {
    await this.page.getByRole('button', { name: `Delete ${title}` }).click();
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete' }).click();
  }

  async clearCompletedTasks() {
    await expect(this.clearCompletedButton).toBeEnabled();
    await this.clearCompletedButton.click();
    const dialog = this.page.getByRole('dialog');
    await expect(dialog.getByText('Clear completed tasks?')).toBeVisible();
    await dialog.getByRole('button', { name: 'Clear completed' }).click();
  }

  async search(text) {
    await this.searchInput.fill(text);
  }

  async chooseSelectOption(label, optionName) {
    await this.page.getByRole('combobox', { name: label }).click();
    await this.page.getByRole('option', { name: optionName }).click();
  }

  taskHeading(title) {
    return this.page.getByRole('heading', { name: title });
  }

  async expectTaskVisible(title) {
    await expect(this.taskHeading(title)).toBeVisible();
  }

  async expectTaskNotVisible(title) {
    await expect(this.taskHeading(title)).toHaveCount(0);
  }

  async expectOverdueVisible() {
    await expect(this.page.getByText('Overdue', { exact: true })).toBeVisible();
  }

  async visibleTaskTitles() {
    return this.page.getByRole('heading', { level: 6 }).allTextContents();
  }
}

module.exports = { TodoPage };
