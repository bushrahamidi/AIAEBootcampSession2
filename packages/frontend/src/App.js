import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Close';
import './App.css';

function extractErrorMessage(data, fallbackMessage) {
  if (data && data.error && data.error.message) {
    return data.error.message;
  }

  return fallbackMessage;
}

function App() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const completedCount = useMemo(
    () => todos.filter((todo) => todo.status === 'completed').length,
    [todos]
  );

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/todos');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Failed to fetch tasks'));
      }

      setTodos(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewDueDate('');
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    if (!newTitle.trim()) {
      showSnackbar('Task title is required', 'error');
      return;
    }

    try {
      const payload = {
        title: newTitle.trim(),
        description: newDescription.trim(),
        dueDate: newDueDate || null,
      };

      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Failed to create task'));
      }

      setTodos((previous) => [data, ...previous]);
      resetCreateForm();
      showSnackbar('Task created');
      setError('');
    } catch (err) {
      showSnackbar(err.message || 'Failed to create task', 'error');
    }
  };

  const handleToggle = async (todoId) => {
    try {
      const response = await fetch(`/api/todos/${todoId}/toggle`, { method: 'PATCH' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Failed to update task status'));
      }

      setTodos((previous) => previous.map((todo) => (todo.id === todoId ? data : todo)));
      showSnackbar(data.status === 'completed' ? 'Task completed' : 'Task marked active');
    } catch (err) {
      showSnackbar(err.message || 'Failed to update task status', 'error');
    }
  };

  const startEditing = (todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditDescription(todo.description || '');
    setEditDueDate(todo.dueDate || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDescription('');
    setEditDueDate('');
  };

  const handleSaveEdit = async (todoId) => {
    if (!editTitle.trim()) {
      showSnackbar('Task title is required', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          dueDate: editDueDate || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Failed to update task'));
      }

      setTodos((previous) => previous.map((todo) => (todo.id === todoId ? data : todo)));
      cancelEditing();
      showSnackbar('Task updated');
    } catch (err) {
      showSnackbar(err.message || 'Failed to update task', 'error');
    }
  };

  const confirmDelete = (todo) => {
    setTodoToDelete(todo);
    setDeleteDialogOpen(true);
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setTodoToDelete(null);
  };

  const handleDelete = async () => {
    if (!todoToDelete) {
      return;
    }

    try {
      const response = await fetch(`/api/todos/${todoToDelete.id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Failed to delete task'));
      }

      setTodos((previous) => previous.filter((todo) => todo.id !== todoToDelete.id));
      showSnackbar('Task deleted');
      cancelDelete();
    } catch (err) {
      showSnackbar(err.message || 'Failed to delete task', 'error');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h3" component="h1" gutterBottom>
            Todo Flow
          </Typography>
          <Typography color="text.secondary">
            Plan, complete, and update your day with confidence.
          </Typography>
        </Box>

        <Card>
          <CardContent>
            <Typography variant="h6" component="h2" gutterBottom>
              Add task
            </Typography>
            <Box component="form" onSubmit={handleCreate}>
              <Stack spacing={2}>
                <TextField
                  label="Task title"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Description"
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                />
                <TextField
                  label="Due date"
                  type="date"
                  value={newDueDate}
                  onChange={(event) => setNewDueDate(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <Box>
                  <Button variant="contained" type="submit">
                    Add task
                  </Button>
                </Box>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={1}
              mb={2}
            >
              <Typography variant="h6" component="h2">
                Tasks
              </Typography>
              <Typography color="text.secondary">{completedCount} completed</Typography>
            </Stack>

            {loading && (
              <Stack direction="row" spacing={1} alignItems="center" role="status" aria-label="loading">
                <CircularProgress size={20} />
                <Typography>Loading tasks...</Typography>
              </Stack>
            )}

            {!loading && error && <Alert severity="error">{error}</Alert>}

            {!loading && !error && todos.length === 0 && (
              <Alert severity="info">No tasks yet. Add your first task to get started.</Alert>
            )}

            {!loading && !error && todos.length > 0 && (
              <Stack spacing={2}>
                {todos.map((todo) => {
                  const isEditing = editingId === todo.id;

                  return (
                    <Card key={todo.id} variant="outlined">
                      <CardContent>
                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                          <Checkbox
                            checked={todo.status === 'completed'}
                            onChange={() => handleToggle(todo.id)}
                            aria-label={`Toggle completion for ${todo.title}`}
                            inputProps={{ 'aria-label': `Toggle completion for ${todo.title}` }}
                            slotProps={{ input: { 'aria-label': `Toggle completion for ${todo.title}` } }}
                          />

                          <Box sx={{ flex: 1 }}>
                            {isEditing ? (
                              <Stack spacing={1.5}>
                                <TextField
                                  label="Task title"
                                  value={editTitle}
                                  onChange={(event) => setEditTitle(event.target.value)}
                                  required
                                  fullWidth
                                  size="small"
                                />
                                <TextField
                                  label="Description"
                                  value={editDescription}
                                  onChange={(event) => setEditDescription(event.target.value)}
                                  fullWidth
                                  size="small"
                                  multiline
                                  minRows={2}
                                />
                                <TextField
                                  label="Due date"
                                  type="date"
                                  value={editDueDate}
                                  onChange={(event) => setEditDueDate(event.target.value)}
                                  InputLabelProps={{ shrink: true }}
                                  fullWidth
                                  size="small"
                                />
                              </Stack>
                            ) : (
                              <>
                                <Typography
                                  variant="subtitle1"
                                  sx={{
                                    textDecoration: todo.status === 'completed' ? 'line-through' : 'none',
                                    color: todo.status === 'completed' ? 'text.secondary' : 'text.primary',
                                  }}
                                >
                                  {todo.title}
                                </Typography>
                                {todo.description && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    {todo.description}
                                  </Typography>
                                )}
                                {todo.dueDate && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Due: {todo.dueDate}
                                  </Typography>
                                )}
                              </>
                            )}
                          </Box>

                          <Stack direction="row" spacing={0.5}>
                            {isEditing ? (
                              <>
                                <IconButton
                                  aria-label={`Save ${todo.title}`}
                                  color="primary"
                                  onClick={() => handleSaveEdit(todo.id)}
                                >
                                  <SaveIcon />
                                </IconButton>
                                <IconButton aria-label={`Cancel edit ${todo.title}`} onClick={cancelEditing}>
                                  <CancelIcon />
                                </IconButton>
                              </>
                            ) : (
                              <>
                                <IconButton
                                  aria-label={`Edit ${todo.title}`}
                                  color="primary"
                                  onClick={() => startEditing(todo)}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  aria-label={`Delete ${todo.title}`}
                                  color="error"
                                  onClick={() => confirmDelete(todo)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </>
                            )}
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>

      <Dialog open={deleteDialogOpen} onClose={cancelDelete} aria-labelledby="delete-task-dialog-title">
        <DialogTitle id="delete-task-dialog-title">Delete task?</DialogTitle>
        <DialogContent>
          <Typography>
            {todoToDelete ? `This will permanently remove "${todoToDelete.title}".` : 'This action cannot be undone.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar((previous) => ({ ...previous, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((previous) => ({ ...previous, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default App;