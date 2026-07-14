const request = require('supertest');
process.env.DB_PATH = ':memory:';
const { app, db, resetDatabase } = require('../src/app');

// Close the database connection after all tests
afterAll(() => {
  if (db) {
    db.close();
  }
});

beforeEach(() => {
  resetDatabase();
});

// Test helpers
const createTodo = async (title = 'Temp Task') => {
  const response = await request(app)
    .post('/api/todos')
    .send({ title })
    .set('Accept', 'application/json');

  expect(response.status).toBe(201);
  expect(response.body).toHaveProperty('id');
  return response.body;
};

describe('TODO API Endpoints', () => {
  describe('POST /api/todos', () => {
    it('should create a new task', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({
          title: 'Prepare demo',
          description: 'Finish API demo setup',
          dueDate: '2026-12-31',
          priority: 'high',
        })
        .set('Accept', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Prepare demo');
      expect(response.body.description).toBe('Finish API demo setup');
      expect(response.body.dueDate).toBe('2026-12-31');
      expect(response.body.priority).toBe('high');
      expect(response.body.status).toBe('active');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should return 400 when title is missing', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({})
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Task title is required',
        },
      });
    });

    it('should return 400 when due date is invalid', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ title: 'Invalid due date task', dueDate: '2026-99-99' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Due date must be a valid date in YYYY-MM-DD format',
        },
      });
    });
  });

  describe('GET /api/todos', () => {
    it('should return all tasks', async () => {
      await createTodo('Task A');
      await createTodo('Task B');

      const response = await request(app).get('/api/todos');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('priority');
      expect(response.body[0]).toHaveProperty('status');
    });

    it('should filter by search text', async () => {
      await createTodo('Buy groceries');
      await createTodo('Plan sprint');

      const response = await request(app).get('/api/todos').query({ search: 'groc' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Buy groceries');
    });

    it('should return 400 on invalid filter values', async () => {
      const response = await request(app).get('/api/todos').query({ status: 'archived' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Status must be one of: active, completed',
        },
      });
    });
  });

  describe('GET /api/todos/:id', () => {
    it('should return one task by id', async () => {
      const todo = await createTodo('Read docs');
      const response = await request(app).get(`/api/todos/${todo.id}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(todo.id);
      expect(response.body.title).toBe('Read docs');
    });

    it('should return 404 when task does not exist', async () => {
      const response = await request(app).get('/api/todos/999999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: {
          code: 'NOT_FOUND',
          message: 'Task not found',
        },
      });
    });
  });

  describe('PUT /api/todos/:id', () => {
    it('should update task fields', async () => {
      const todo = await createTodo('Initial title');
      const response = await request(app)
        .put(`/api/todos/${todo.id}`)
        .send({
          title: 'Updated title',
          priority: 'low',
          status: 'completed',
        })
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated title');
      expect(response.body.priority).toBe('low');
      expect(response.body.status).toBe('completed');
      expect(response.body.completedAt).not.toBeNull();
    });

    it('should return 400 when update payload is invalid', async () => {
      const todo = await createTodo('Needs valid payload');
      const response = await request(app)
        .put(`/api/todos/${todo.id}`)
        .send({ dueDate: '10-10-2026' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Due date must be a valid date in YYYY-MM-DD format',
        },
      });
    });
  });

  describe('PATCH /api/todos/:id/toggle', () => {
    it('should toggle task status from active to completed and back', async () => {
      const todo = await createTodo('Toggle me');

      const completeResponse = await request(app).patch(`/api/todos/${todo.id}/toggle`);
      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.status).toBe('completed');
      expect(completeResponse.body.completedAt).not.toBeNull();

      const activeResponse = await request(app).patch(`/api/todos/${todo.id}/toggle`);
      expect(activeResponse.status).toBe(200);
      expect(activeResponse.body.status).toBe('active');
      expect(activeResponse.body.completedAt).toBeNull();
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app).patch('/api/todos/7777/toggle');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: {
          code: 'NOT_FOUND',
          message: 'Task not found',
        },
      });
    });
  });

  describe('DELETE /api/todos/:id', () => {
    it('should delete an existing task', async () => {
      const todo = await createTodo('Delete me');

      const deleteResponse = await request(app).delete(`/api/todos/${todo.id}`);
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toEqual({ message: 'Task deleted successfully', id: todo.id });

      const getDeletedResponse = await request(app).get(`/api/todos/${todo.id}`);
      expect(getDeletedResponse.status).toBe(404);
    });

    it('should return 400 for invalid id', async () => {
      const response = await request(app).delete('/api/todos/abc');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Valid task ID is required',
        },
      });
    });
  });

  describe('DELETE /api/todos/completed', () => {
    it('should clear all completed tasks', async () => {
      const activeTask = await createTodo('Keep me active');
      const completedTask = await createTodo('Complete and remove');

      await request(app).patch(`/api/todos/${completedTask.id}/toggle`);

      const clearResponse = await request(app).delete('/api/todos/completed');
      expect(clearResponse.status).toBe(200);
      expect(clearResponse.body).toEqual({
        message: 'Completed tasks cleared',
        deletedCount: 1,
      });

      const todosResponse = await request(app).get('/api/todos');
      expect(todosResponse.status).toBe(200);
      expect(todosResponse.body).toHaveLength(1);
      expect(todosResponse.body[0].id).toBe(activeTask.id);
    });
  });
});