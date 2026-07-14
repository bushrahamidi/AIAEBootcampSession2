async function getTodos(request) {
  const response = await request.get('/api/todos');
  if (!response.ok()) {
    throw new Error('Failed to fetch todos for E2E setup');
  }

  return response.json();
}

async function clearAllTodos(request) {
  await request.delete('/api/todos/completed');

  const todos = await getTodos(request);
  for (const todo of todos) {
    await request.delete(`/api/todos/${todo.id}`);
  }
}

async function createTodo(request, payload) {
  const response = await request.post('/api/todos', { data: payload });
  if (!response.ok()) {
    throw new Error('Failed to create todo for E2E setup');
  }

  return response.json();
}

module.exports = {
  clearAllTodos,
  createTodo,
};
