const request = require('supertest');

process.env.DB_PATH = ':memory:';
const { app, db, resetDatabase } = require('../../src/app');

describe('Todos API Integration', () => {
  beforeEach(() => {
    resetDatabase();
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  it('creates and retrieves a todo through API endpoints', async () => {
    const createResponse = await request(app)
      .post('/api/todos')
      .send({
        title: 'Integration todo',
        description: 'Created in integration test',
        dueDate: '2026-12-01',
        priority: 'medium',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toHaveProperty('id');
    expect(createResponse.body.title).toBe('Integration todo');

    const getResponse = await request(app).get('/api/todos');

    expect(getResponse.status).toBe(200);
    expect(Array.isArray(getResponse.body)).toBe(true);
    expect(getResponse.body.length).toBe(1);
    expect(getResponse.body[0].title).toBe('Integration todo');
  });
});
