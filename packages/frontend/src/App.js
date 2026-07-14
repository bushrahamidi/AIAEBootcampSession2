import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
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

function isOverdue(todo) {
  if (!todo.dueDate || todo.status === 'completed') {
    return false;
  }

  const today = new Date();
  const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDate = new Date(`${todo.dueDate}T00:00:00`);

  return dueDate < localDate;
}

function buildTodosUrl({ searchText, statusFilter, priorityFilter, dueDateRangeFilter, sortBy, sortOrder }) {
  const queryParams = new URLSearchParams();

  if (searchText.trim()) {
    queryParams.set('search', searchText.trim());
  }

  if (statusFilter !== 'all') {
    queryParams.set('status', statusFilter);
  }

  if (priorityFilter !== 'all') {
    queryParams.set('priority', priorityFilter);
  }

  if (dueDateRangeFilter !== 'all') {
    queryParams.set('dueDateRange', dueDateRangeFilter);
  }

  queryParams.set('sortBy', sortBy);
  queryParams.set('sortOrder', sortOrder);

  const queryString = queryParams.toString();
  return queryString ? `/api/todos?${queryString}` : '/api/todos';
}

function App() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dueDateRangeFilter, setDueDateRangeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState(null);

  const [clearCompletedDialogOpen, setClearCompletedDialogOpen] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const completedCount = useMemo(
    () => todos.filter((todo) => todo.status === 'completed').length,
    [todos]
  );

  const overdueCount = useMemo(() => todos.filter((todo) => isOverdue(todo)).length, [todos]);

  useEffect(() => {
    fetchTodos();
  }, [searchText, statusFilter, priorityFilter, dueDateRangeFilter, sortBy, sortOrder]);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const url = buildTodosUrl({
        searchText,
        statusFilter,
        priorityFilter,
        dueDateRangeFilter,
        sortBy,
        sortOrder,
      });
      const response = await fetch(url);
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

      await fetchTodos();
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

      await fetchTodos();
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

      await fetchTodos();
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

      await fetchTodos();
      showSnackbar('Task deleted');
      cancelDelete();
    } catch (err) {
      showSnackbar(err.message || 'Failed to delete task', 'error');
    }
  };

  const resetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setDueDateRangeFilter('all');
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  const handleClearCompleted = async () => {
    try {
      const response = await fetch('/api/todos/completed', { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Failed to clear completed tasks'));
      }

      await fetchTodos();
      setClearCompletedDialogOpen(false);
      showSnackbar(`Cleared ${data.deletedCount} completed task${data.deletedCount === 1 ? '' : 's'}`);
    } catch (err) {
      showSnackbar(err.message || 'Failed to clear completed tasks', 'error');
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
            <Stack spacing={2}>
              <Typography variant="h6" component="h2">
                Find and organize
              </Typography>

              <TextField
                label="Search tasks"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search by title or description"
                fullWidth
                inputProps={{ 'aria-label': 'Search tasks' }}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel id="status-filter-label">Status</InputLabel>
                    <Select
                      labelId="status-filter-label"
                      label="Status"
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel id="priority-filter-label">Priority</InputLabel>
                    <Select
                      labelId="priority-filter-label"
                      label="Priority"
                      value={priorityFilter}
                      onChange={(event) => setPriorityFilter(event.target.value)}
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="low">Low</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel id="due-filter-label">Due date</InputLabel>
                    <Select
                      labelId="due-filter-label"
                      label="Due date"
                      value={dueDateRangeFilter}
                      onChange={(event) => setDueDateRangeFilter(event.target.value)}
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="today">Today</MenuItem>
                      <MenuItem value="week">This week</MenuItem>
                      <MenuItem value="overdue">Overdue</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel id="sort-by-label">Sort by</InputLabel>
                    <Select
                      labelId="sort-by-label"
                      label="Sort by"
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value)}
                    >
                      <MenuItem value="createdAt">Created date</MenuItem>
                      <MenuItem value="dueDate">Due date</MenuItem>
                      <MenuItem value="priority">Priority</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <FormControl sx={{ minWidth: 180 }}>
                  <InputLabel id="sort-order-label">Sort order</InputLabel>
                  <Select
                    labelId="sort-order-label"
                    label="Sort order"
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value)}
                  >
                    <MenuItem value="asc">Ascending</MenuItem>
                    <MenuItem value="desc">Descending</MenuItem>
                  </Select>
                </FormControl>

                <Button variant="outlined" onClick={resetFilters}>
                  Reset controls
                </Button>
              </Stack>
            </Stack>
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
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={`${completedCount} completed`} size="small" />
                <Chip
                  label={`${overdueCount} overdue`}
                  size="small"
                  color={overdueCount > 0 ? 'warning' : 'default'}
                />
                <Button
                  color="error"
                  variant="outlined"
                  onClick={() => setClearCompletedDialogOpen(true)}
                  disabled={completedCount === 0}
                >
                  Clear completed
                </Button>
              </Stack>
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} aria-live="polite">
              Showing {todos.length} task{todos.length === 1 ? '' : 's'}.
            </Typography>

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
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
                                  <Chip
                                    size="small"
                                    label={`Priority: ${todo.priority}`}
                                    color={todo.priority === 'high' ? 'error' : 'default'}
                                    variant="outlined"
                                  />
                                  {isOverdue(todo) && <Chip size="small" label="Overdue" color="warning" />}
                                </Stack>
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

      <Dialog
        open={clearCompletedDialogOpen}
        onClose={() => setClearCompletedDialogOpen(false)}
        aria-labelledby="clear-completed-dialog-title"
      >
        <DialogTitle id="clear-completed-dialog-title">Clear completed tasks?</DialogTitle>
        <DialogContent>
          <Typography>
            This will remove all completed tasks. This is a destructive action and cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearCompletedDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleClearCompleted}>
            Clear completed
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