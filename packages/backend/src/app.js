const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const VALID_PRIORITIES = ['low', 'medium', 'high'];
const VALID_STATUSES = ['active', 'completed'];

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const dataDir = path.join(__dirname, '..', 'data');
const databasePath = process.env.DB_PATH || path.join(dataDir, 'todos.db');

if (databasePath !== ':memory:') {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

const db = new Database(databasePath);

db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
  )
`);

function toTodo(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    dueDate: row.due_date,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function toItem(todo) {
  return {
    id: todo.id,
    name: todo.title,
    created_at: todo.createdAt,
  };
}

function sendError(res, status, code, message, details) {
  const payload = {
    error: {
      code,
      message,
    },
  };

  if (details) {
    payload.error.details = details;
  }

  return res.status(status).json(payload);
}

function parseId(idParam) {
  const id = Number.parseInt(idParam, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  return value.trim();
}

function isValidIsoDate(dateString) {
  if (!dateString) {
    return true;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }

  const parsedDate = new Date(`${dateString}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === dateString;
}

function validateCreatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, message: 'Request body is required' };
  }

  if (typeof payload.title !== 'string' || payload.title.trim() === '') {
    return { valid: false, message: 'Task title is required' };
  }

  if (payload.priority && !VALID_PRIORITIES.includes(payload.priority)) {
    return {
      valid: false,
      message: 'Priority must be one of: low, medium, high',
    };
  }

  if (payload.dueDate && !isValidIsoDate(payload.dueDate)) {
    return { valid: false, message: 'Due date must be a valid date in YYYY-MM-DD format' };
  }

  return { valid: true };
}

function validateUpdatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, message: 'Request body is required' };
  }

  const allowedFields = ['title', 'description', 'dueDate', 'priority', 'status'];
  const keys = Object.keys(payload);

  if (keys.length === 0) {
    return { valid: false, message: 'At least one field is required for update' };
  }

  const hasInvalidField = keys.some((field) => !allowedFields.includes(field));
  if (hasInvalidField) {
    return { valid: false, message: 'Update contains unsupported fields' };
  }

  if (payload.title !== undefined && (typeof payload.title !== 'string' || payload.title.trim() === '')) {
    return { valid: false, message: 'Task title cannot be empty' };
  }

  if (payload.priority !== undefined && !VALID_PRIORITIES.includes(payload.priority)) {
    return { valid: false, message: 'Priority must be one of: low, medium, high' };
  }

  if (payload.status !== undefined && !VALID_STATUSES.includes(payload.status)) {
    return { valid: false, message: 'Status must be one of: active, completed' };
  }

  if (payload.dueDate !== undefined && payload.dueDate !== null && !isValidIsoDate(payload.dueDate)) {
    return { valid: false, message: 'Due date must be a valid date in YYYY-MM-DD format' };
  }

  return { valid: true };
}

const getTodoByIdStmt = db.prepare('SELECT * FROM todos WHERE id = ?');

const createTodoStmt = db.prepare(`
  INSERT INTO todos (title, description, due_date, priority, status, completed_at)
  VALUES (@title, @description, @due_date, @priority, @status, @completed_at)
`);

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend server is running' });
});

app.get('/api/todos', (req, res) => {
  try {
    const { status, priority, search, dueDateRange, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const clauses = [];
    const params = {};

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Status must be one of: active, completed');
      }
      clauses.push('status = @status');
      params.status = status;
    }

    if (priority) {
      if (!VALID_PRIORITIES.includes(priority)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Priority must be one of: low, medium, high');
      }
      clauses.push('priority = @priority');
      params.priority = priority;
    }

    if (search) {
      clauses.push("(LOWER(title) LIKE LOWER(@search) OR LOWER(COALESCE(description, '')) LIKE LOWER(@search))");
      params.search = `%${search}%`;
    }

    if (dueDateRange === 'today') {
      clauses.push("due_date = date('now')");
    } else if (dueDateRange === 'week') {
      clauses.push("due_date BETWEEN date('now') AND date('now', '+7 day')");
    } else if (dueDateRange === 'overdue') {
      clauses.push("due_date < date('now') AND status = 'active'");
    } else if (dueDateRange) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Due date range must be one of: today, week, overdue');
    }

    const sortColumnByField = {
      dueDate: 'due_date',
      priority: "CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END",
      createdAt: 'created_at',
    };

    const sortColumn = sortColumnByField[sortBy];
    if (!sortColumn) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'sortBy must be one of: dueDate, priority, createdAt');
    }

    const normalizedSortOrder = String(sortOrder).toLowerCase();
    if (!['asc', 'desc'].includes(normalizedSortOrder)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'sortOrder must be one of: asc, desc');
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const query = `
      SELECT * FROM todos
      ${whereClause}
      ORDER BY ${sortColumn} ${normalizedSortOrder}, created_at DESC
    `;

    const todos = db.prepare(query).all(params).map(toTodo);
    return res.json(todos);
  } catch (error) {
    console.error('Error fetching todos:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch todos');
  }
});

app.get('/api/todos/:id', (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Valid task ID is required');
    }

    const todo = toTodo(getTodoByIdStmt.get(id));
    if (!todo) {
      return sendError(res, 404, 'NOT_FOUND', 'Task not found');
    }

    return res.json(todo);
  } catch (error) {
    console.error('Error fetching todo:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch todo');
  }
});

app.post('/api/todos', (req, res) => {
  try {
    const validation = validateCreatePayload(req.body);
    if (!validation.valid) {
      return sendError(res, 400, 'VALIDATION_ERROR', validation.message);
    }

    const payload = {
      title: req.body.title.trim(),
      description: normalizeOptionalText(req.body.description),
      due_date: req.body.dueDate || null,
      priority: req.body.priority || 'medium',
      status: 'active',
      completed_at: null,
    };

    const result = createTodoStmt.run(payload);
    const todo = toTodo(getTodoByIdStmt.get(result.lastInsertRowid));
    return res.status(201).json(todo);
  } catch (error) {
    console.error('Error creating todo:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to create todo');
  }
});

app.put('/api/todos/:id', (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Valid task ID is required');
    }

    const existing = getTodoByIdStmt.get(id);
    if (!existing) {
      return sendError(res, 404, 'NOT_FOUND', 'Task not found');
    }

    const validation = validateUpdatePayload(req.body);
    if (!validation.valid) {
      return sendError(res, 400, 'VALIDATION_ERROR', validation.message);
    }

    const nextStatus = req.body.status !== undefined ? req.body.status : existing.status;

    const nextValues = {
      title: req.body.title !== undefined ? req.body.title.trim() : existing.title,
      description: req.body.description !== undefined ? normalizeOptionalText(req.body.description) : existing.description,
      due_date: req.body.dueDate !== undefined ? req.body.dueDate : existing.due_date,
      priority: req.body.priority !== undefined ? req.body.priority : existing.priority,
      status: nextStatus,
      completed_at:
        nextStatus === 'completed'
          ? existing.completed_at || new Date().toISOString()
          : null,
      id,
    };

    db.prepare(`
      UPDATE todos
      SET
        title = @title,
        description = @description,
        due_date = @due_date,
        priority = @priority,
        status = @status,
        completed_at = @completed_at,
        updated_at = datetime('now')
      WHERE id = @id
    `).run(nextValues);

    const todo = toTodo(getTodoByIdStmt.get(id));
    return res.json(todo);
  } catch (error) {
    console.error('Error updating todo:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to update todo');
  }
});

app.patch('/api/todos/:id/toggle', (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Valid task ID is required');
    }

    const existing = getTodoByIdStmt.get(id);
    if (!existing) {
      return sendError(res, 404, 'NOT_FOUND', 'Task not found');
    }

    const nextStatus = existing.status === 'completed' ? 'active' : 'completed';
    const completedAt = nextStatus === 'completed' ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE todos
      SET
        status = ?,
        completed_at = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(nextStatus, completedAt, id);

    const todo = toTodo(getTodoByIdStmt.get(id));
    return res.json(todo);
  } catch (error) {
    console.error('Error toggling todo:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to toggle todo');
  }
});

app.delete('/api/todos/completed', (req, res) => {
  try {
    const result = db.prepare("DELETE FROM todos WHERE status = 'completed'").run();
    return res.json({ message: 'Completed tasks cleared', deletedCount: result.changes });
  } catch (error) {
    console.error('Error clearing completed todos:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to clear completed todos');
  }
});

app.delete('/api/todos/:id', (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Valid task ID is required');
    }

    const existing = getTodoByIdStmt.get(id);
    if (!existing) {
      return sendError(res, 404, 'NOT_FOUND', 'Task not found');
    }

    db.prepare('DELETE FROM todos WHERE id = ?').run(id);
    return res.json({ message: 'Task deleted successfully', id });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to delete todo');
  }
});

// Compatibility routes for the existing frontend until it is migrated to /api/todos.
app.get('/api/items', (req, res) => {
  try {
    const todos = db.prepare('SELECT * FROM todos ORDER BY created_at DESC').all().map(toTodo).map(toItem);
    return res.json(todos);
  } catch (error) {
    console.error('Error fetching items:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch items');
  }
});

app.post('/api/items', (req, res) => {
  try {
    if (!req.body || typeof req.body.name !== 'string' || req.body.name.trim() === '') {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Item name is required');
    }

    const result = createTodoStmt.run({
      title: req.body.name.trim(),
      description: null,
      due_date: null,
      priority: 'medium',
      status: 'active',
      completed_at: null,
    });

    const todo = toTodo(getTodoByIdStmt.get(result.lastInsertRowid));
    return res.status(201).json(toItem(todo));
  } catch (error) {
    console.error('Error creating item:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to create item');
  }
});

app.delete('/api/items/:id', (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Valid item ID is required');
    }

    const existing = getTodoByIdStmt.get(id);
    if (!existing) {
      return sendError(res, 404, 'NOT_FOUND', 'Item not found');
    }

    db.prepare('DELETE FROM todos WHERE id = ?').run(id);
    return res.json({ message: 'Item deleted successfully', id });
  } catch (error) {
    console.error('Error deleting item:', error);
    return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to delete item');
  }
});

function resetDatabase() {
  db.prepare('DELETE FROM todos').run();
}

module.exports = { app, db, resetDatabase };