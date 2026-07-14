import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import App from '../App';

jest.setTimeout(15000);

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const now = new Date();
const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
const inFiveDays = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5);

const initialTodos = [
  {
    id: 1,
    title: 'Write docs',
    description: 'Update README',
    dueDate: formatLocalDate(yesterday),
    priority: 'medium',
    status: 'active',
    createdAt: '2026-07-10T08:00:00.000Z',
    updatedAt: '2026-07-10T08:00:00.000Z',
    completedAt: null,
  },
  {
    id: 2,
    title: 'Ship release notes',
    description: '',
    dueDate: formatLocalDate(inFiveDays),
    priority: 'high',
    status: 'completed',
    createdAt: '2026-07-11T10:00:00.000Z',
    updatedAt: '2026-07-11T10:00:00.000Z',
    completedAt: '2026-07-12T10:00:00.000Z',
  },
  {
    id: 3,
    title: 'Prepare retro board',
    description: 'Gather sprint highlights',
    dueDate: formatLocalDate(tomorrow),
    priority: 'low',
    status: 'active',
    createdAt: '2026-07-12T10:00:00.000Z',
    updatedAt: '2026-07-12T10:00:00.000Z',
    completedAt: null,
  },
];

let todos;
let lastRequestQuery = {};

function applyQuery(data, query) {
  let result = [...data];

  if (query.status) {
    result = result.filter((todo) => todo.status === query.status);
  }

  if (query.priority) {
    result = result.filter((todo) => todo.priority === query.priority);
  }

  if (query.search) {
    const normalizedSearch = query.search.toLowerCase();
    result = result.filter(
      (todo) =>
        todo.title.toLowerCase().includes(normalizedSearch) ||
        (todo.description || '').toLowerCase().includes(normalizedSearch)
    );
  }

  if (query.dueDateRange === 'today') {
    const today = formatLocalDate(new Date());
    result = result.filter((todo) => todo.dueDate === today);
  }

  if (query.dueDateRange === 'week') {
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
    result = result.filter((todo) => {
      if (!todo.dueDate) {
        return false;
      }

      const due = new Date(`${todo.dueDate}T00:00:00`);
      return due >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) && due <= end;
    });
  }

  if (query.dueDateRange === 'overdue') {
    const today = new Date();
    const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    result = result.filter((todo) => {
      if (!todo.dueDate || todo.status !== 'active') {
        return false;
      }

      const due = new Date(`${todo.dueDate}T00:00:00`);
      return due < localToday;
    });
  }

  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder || 'desc';
  const direction = sortOrder === 'asc' ? 1 : -1;

  const priorityRank = { high: 1, medium: 2, low: 3 };
  result.sort((a, b) => {
    if (sortBy === 'priority') {
      return (priorityRank[a.priority] - priorityRank[b.priority]) * direction;
    }

    if (sortBy === 'dueDate') {
      const aDate = a.dueDate || '9999-12-31';
      const bDate = b.dueDate || '9999-12-31';
      return aDate.localeCompare(bDate) * direction;
    }

    return a.createdAt.localeCompare(b.createdAt) * direction;
  });

  return result;
}

async function chooseSelectOption(user, label, optionName) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: optionName }));
}

const server = setupServer(
  rest.get('/api/todos', (req, res, ctx) => {
    lastRequestQuery = Object.fromEntries(req.url.searchParams.entries());
    return res(ctx.status(200), ctx.json(applyQuery(todos, lastRequestQuery)));
  }),

  rest.post('/api/todos', (req, res, ctx) => {
    const { title, description, dueDate } = req.body;

    if (!title || title.trim() === '') {
      return res(
        ctx.status(400),
        ctx.json({ error: { message: 'Task title is required' } })
      );
    }

    const newTodo = {
      id: 999,
      title,
      description: description || '',
      dueDate: dueDate || null,
      priority: 'medium',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };
    todos = [newTodo, ...todos];

    return res(ctx.status(201), ctx.json(newTodo));
  }),

  rest.patch('/api/todos/:id/toggle', (req, res, ctx) => {
    const id = Number(req.params.id);
    const target = todos.find((todo) => todo.id === id);

    if (!target) {
      return res(ctx.status(404), ctx.json({ error: { message: 'Task not found' } }));
    }

    const nextStatus = target.status === 'completed' ? 'active' : 'completed';
    const updated = {
      ...target,
      status: nextStatus,
      completedAt: nextStatus === 'completed' ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    };

    todos = todos.map((todo) => (todo.id === id ? updated : todo));
    return res(ctx.status(200), ctx.json(updated));
  }),

  rest.put('/api/todos/:id', (req, res, ctx) => {
    const id = Number(req.params.id);
    const target = todos.find((todo) => todo.id === id);

    if (!target) {
      return res(ctx.status(404), ctx.json({ error: { message: 'Task not found' } }));
    }

    const { title, description, dueDate } = req.body;
    if (!title || title.trim() === '') {
      return res(ctx.status(400), ctx.json({ error: { message: 'Task title cannot be empty' } }));
    }

    const updated = {
      ...target,
      title,
      description: description || '',
      dueDate: dueDate || null,
      updatedAt: new Date().toISOString(),
    };

    todos = todos.map((todo) => (todo.id === id ? updated : todo));
    return res(ctx.status(200), ctx.json(updated));
  }),

  rest.delete('/api/todos/completed', (req, res, ctx) => {
    const beforeCount = todos.length;
    todos = todos.filter((todo) => todo.status !== 'completed');
    const deletedCount = beforeCount - todos.length;

    return res(ctx.status(200), ctx.json({ message: 'Completed tasks cleared', deletedCount }));
  }),

  rest.delete('/api/todos/:id', (req, res, ctx) => {
    const id = Number(req.params.id);
    const exists = todos.some((todo) => todo.id === id);

    if (!exists) {
      return res(ctx.status(404), ctx.json({ error: { message: 'Task not found' } }));
    }

    todos = todos.filter((todo) => todo.id !== id);
    return res(
      ctx.status(200),
      ctx.json({ message: 'Task deleted successfully', id })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  todos = initialTodos.map((todo) => ({ ...todo }));
  lastRequestQuery = {};
});
afterAll(() => server.close());

beforeEach(() => {
  todos = initialTodos.map((todo) => ({ ...todo }));
  lastRequestQuery = {};
});

describe('App Component', () => {
  test('renders shell and loaded tasks', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Todo Flow' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Write docs')).toBeInTheDocument();
      expect(screen.getByText('Ship release notes')).toBeInTheDocument();
      expect(screen.getByText('Prepare retro board')).toBeInTheDocument();
    });
  });

  test('shows loading state before data resolves', async () => {
    render(<App />);
    expect(screen.getByRole('status', { name: 'loading' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: 'loading' })).not.toBeInTheDocument();
    });
  });

  test('shows empty state when no tasks are returned', async () => {
    server.use(rest.get('/api/todos', (req, res, ctx) => res(ctx.status(200), ctx.json([]))));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('No tasks yet. Add your first task to get started.')).toBeInTheDocument();
    });
  });

  test('shows error state when load fails', async () => {
    server.use(rest.get('/api/todos', (req, res, ctx) => res(ctx.status(500), ctx.json({}))));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch tasks')).toBeInTheDocument();
    });
  });

  test('shows overdue indicator for overdue active tasks', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });
  });

  test('searches tasks by title text', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Prepare retro board')).toBeInTheDocument();
    });

    await user.type(screen.getByRole('textbox', { name: 'Search tasks' }), 'retro');

    await waitFor(() => {
      expect(screen.getByText('Prepare retro board')).toBeInTheDocument();
      expect(screen.queryByText('Write docs')).not.toBeInTheDocument();
    });
  });

  test('filters tasks by status', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Ship release notes')).toBeInTheDocument();
    });

    await chooseSelectOption(user, 'Status', 'Completed');

    await waitFor(() => {
      expect(screen.getByText('Ship release notes')).toBeInTheDocument();
      expect(screen.queryByText('Write docs')).not.toBeInTheDocument();
      expect(screen.queryByText('Prepare retro board')).not.toBeInTheDocument();
    });
  });

  test('sends sort query when sort controls change', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Write docs')).toBeInTheDocument();
    });

    await chooseSelectOption(user, 'Sort by', 'Priority');
    await chooseSelectOption(user, 'Sort order', 'Ascending');

    await waitFor(() => {
      expect(lastRequestQuery.sortBy).toBe('priority');
      expect(lastRequestQuery.sortOrder).toBe('asc');
    });
  });

  test('clears all completed tasks with confirmation', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Ship release notes')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Clear completed' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Clear completed tasks?')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Clear completed' }));

    await waitFor(() => {
      expect(screen.queryByText('Ship release notes')).not.toBeInTheDocument();
    });
  });

  test('creates a task', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Write docs')).toBeInTheDocument();
    });

    await user.type(screen.getByRole('textbox', { name: 'Task title' }), 'Prep sprint board');
    await user.type(screen.getByRole('textbox', { name: 'Description' }), 'Align priorities');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    await waitFor(() => {
      expect(screen.getByText('Prep sprint board')).toBeInTheDocument();
    });
  });

  test('toggles completion status', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Write docs')).toBeInTheDocument();
    });

    const toggleCheckbox = screen.getByRole('checkbox', { name: 'Toggle completion for Write docs' });
    expect(toggleCheckbox).not.toBeChecked();

    await user.click(toggleCheckbox);

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Toggle completion for Write docs' })).toBeChecked();
    });

    expect(screen.getByText('Task completed')).toBeInTheDocument();
  });

  test('edits and saves a task', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Write docs')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Edit Write docs' }));

    const titleInputs = screen.getAllByRole('textbox', { name: 'Task title' });
    const editTitleInput = titleInputs[1];
    await user.clear(editTitleInput);
    await user.type(editTitleInput, 'Write final docs');

    await user.click(screen.getByRole('button', { name: 'Save Write docs' }));

    await waitFor(() => {
      expect(screen.getByText('Write final docs')).toBeInTheDocument();
    });

    expect(screen.getByText('Task updated')).toBeInTheDocument();
  });

  test('deletes a task via confirmation dialog', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Write docs')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Delete Write docs' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Delete task?')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.queryByText('Write docs')).not.toBeInTheDocument();
    });
  });
});