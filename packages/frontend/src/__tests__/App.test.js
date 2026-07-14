import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import App from '../App';

const initialTodos = [
  {
    id: 1,
    title: 'Write docs',
    description: 'Update README',
    dueDate: '2026-08-01',
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
    dueDate: null,
    priority: 'high',
    status: 'completed',
    createdAt: '2026-07-11T10:00:00.000Z',
    updatedAt: '2026-07-11T10:00:00.000Z',
    completedAt: '2026-07-12T10:00:00.000Z',
  },
];

let todos;

const server = setupServer(
  rest.get('/api/todos', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(todos));
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
});
afterAll(() => server.close());

beforeEach(() => {
  todos = initialTodos.map((todo) => ({ ...todo }));
});

describe('App Component', () => {
  test('renders shell and loaded tasks', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Todo Flow' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Write docs')).toBeInTheDocument();
      expect(screen.getByText('Ship release notes')).toBeInTheDocument();
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

    expect(screen.getByText('Task created')).toBeInTheDocument();
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

    expect(screen.getByText('Task deleted')).toBeInTheDocument();
  });
});