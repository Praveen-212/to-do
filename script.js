/* ============================================================
   script.js — TaskFlow Application Logic
   ============================================================ */

// ──────────────────────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────────────────────
const state = {
  user: null,
  tasks: [],
  filter: {
    status:   'all',   // 'all' | 'pending' | 'completed'
    priority: 'all',   // 'all' | 'high' | 'medium' | 'low'
    category: 'all',   // 'all' | <category string>
    search:   '',
    sort:     'created_at', // 'created_at' | 'due_date' | 'priority'
  },
  darkMode:       localStorage.getItem('darkMode') === 'true',
  editingTaskId:  null,
  deletingTaskId: null,
};

// ──────────────────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────────────────
async function init() {
  applyDarkMode(state.darkMode);

  // Restore any existing session
  try {
    const { data: { session } } = await db.auth.getSession();
    if (session?.user) {
      await onSignedIn(session.user);
    }
  } catch (err) {
    console.error('Session check failed:', err);
  }

  // React to future auth events
  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      await onSignedIn(session.user);
    } else if (event === 'SIGNED_OUT') {
      onSignedOut();
    }
  });

  // Global keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closeDeleteModal();
      closeUserMenu();
    }
    // Ctrl/Cmd + K → focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('search-input')?.focus();
    }
  });

  // Close user dropdown on outside click
  document.addEventListener('click', e => {
    const wrap = document.getElementById('user-menu-wrap');
    if (wrap && !wrap.contains(e.target)) closeUserMenu();
  });
}

// ──────────────────────────────────────────────────────────────
// AUTH — helpers
// ──────────────────────────────────────────────────────────────
async function onSignedIn(user) {
  state.user = user;

  // Show app, hide auth
  document.getElementById('auth-screen').style.display  = 'none';
  document.getElementById('app-screen').style.display   = 'flex';
  document.getElementById('fab-btn').style.display      = 'flex';

  // Populate user info
  document.getElementById('user-email-display').textContent = user.email ?? '';
  document.getElementById('user-avatar').textContent        = (user.email?.[0] ?? 'U').toUpperCase();

  await fetchTasks();
}

function onSignedOut() {
  state.user  = null;
  state.tasks = [];

  document.getElementById('app-screen').style.display  = 'none';
  document.getElementById('fab-btn').style.display     = 'none';
  document.getElementById('auth-screen').style.display = 'flex';

  // Clear search input
  document.getElementById('search-input').value = '';

  showToast('Signed out successfully.', 'info');
}

// ──────────────────────────────────────────────────────────────
// AUTH — event handlers
// ──────────────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn      = document.getElementById('login-btn');
  const errEl    = document.getElementById('login-error');

  errEl.classList.add('hidden');
  setButtonLoading(btn, true, 'Signing in…');

  try {
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (err) {
    showFieldError(errEl, err.message);
    setButtonLoading(btn, false, 'Sign In');
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirm  = document.getElementById('signup-confirm').value;
  const btn      = document.getElementById('signup-btn');
  const errEl    = document.getElementById('signup-error');

  errEl.classList.add('hidden');

  if (password !== confirm) {
    showFieldError(errEl, 'Passwords do not match.');
    return;
  }
  if (password.length < 6) {
    showFieldError(errEl, 'Password must be at least 6 characters.');
    return;
  }

  setButtonLoading(btn, true, 'Creating account…');

  try {
    const { error } = await db.auth.signUp({ email, password });
    if (error) throw error;
    showToast('Account created! Check your email to verify.', 'success');
    switchTab('login');
    document.getElementById('login-email').value = email;
  } catch (err) {
    showFieldError(errEl, err.message);
  } finally {
    setButtonLoading(btn, false, 'Create Account');
  }
}

async function handleSignOut() {
  closeUserMenu();
  try {
    await db.auth.signOut();
  } catch (err) {
    showToast('Sign-out failed: ' + err.message, 'error');
  }
}

function switchTab(tab) {
  const isLogin = (tab === 'login');
  document.getElementById('login-form').classList.toggle('hidden', !isLogin);
  document.getElementById('signup-form').classList.toggle('hidden', isLogin);

  const activeClasses   = ['bg-white', 'dark:bg-gray-600', 'text-gray-900', 'dark:text-white', 'shadow-sm'];
  const inactiveClasses = ['text-gray-500', 'dark:text-gray-400'];

  const loginTab  = document.getElementById('tab-login');
  const signupTab = document.getElementById('tab-signup');

  if (isLogin) {
    activeClasses.forEach(c => loginTab.classList.add(c));
    inactiveClasses.forEach(c => loginTab.classList.remove(c));
    activeClasses.forEach(c => signupTab.classList.remove(c));
    inactiveClasses.forEach(c => signupTab.classList.add(c));
  } else {
    activeClasses.forEach(c => signupTab.classList.add(c));
    inactiveClasses.forEach(c => signupTab.classList.remove(c));
    activeClasses.forEach(c => loginTab.classList.remove(c));
    inactiveClasses.forEach(c => loginTab.classList.add(c));
  }
}

// ──────────────────────────────────────────────────────────────
// TASKS — CRUD
// ──────────────────────────────────────────────────────────────
async function fetchTasks() {
  showTasksLoading(true);
  try {
    const { data, error } = await db
      .from('todos')
      .select('*')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    state.tasks = data ?? [];
    renderAll();
  } catch (err) {
    showToast('Failed to load tasks: ' + err.message, 'error');
  } finally {
    showTasksLoading(false);
  }
}

async function addTask(payload) {
  try {
    const { data, error } = await db
      .from('todos')
      .insert([{ ...payload, user_id: state.user.id }])
      .select()
      .single();

    if (error) throw error;
    state.tasks.unshift(data);
    renderAll();
    showToast('Task added!', 'success');
    return true;
  } catch (err) {
    showToast('Failed to add task: ' + err.message, 'error');
    return false;
  }
}

async function updateTask(id, payload) {
  try {
    const { data, error } = await db
      .from('todos')
      .update(payload)
      .eq('id', id)
      .eq('user_id', state.user.id)
      .select()
      .single();

    if (error) throw error;
    const idx = state.tasks.findIndex(t => t.id === id);
    if (idx !== -1) state.tasks[idx] = data;
    renderAll();
    showToast('Task updated!', 'success');
    return true;
  } catch (err) {
    showToast('Failed to update task: ' + err.message, 'error');
    return false;
  }
}

async function deleteTask(id) {
  try {
    const { error } = await db
      .from('todos')
      .delete()
      .eq('id', id)
      .eq('user_id', state.user.id);

    if (error) throw error;
    state.tasks = state.tasks.filter(t => t.id !== id);
    renderAll();
    showToast('Task deleted.', 'info');
    return true;
  } catch (err) {
    showToast('Failed to delete task: ' + err.message, 'error');
    return false;
  }
}

async function toggleComplete(id, completed) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  // Optimistic update
  task.completed = completed;
  renderAll();

  try {
    const { error } = await db
      .from('todos')
      .update({ completed })
      .eq('id', id)
      .eq('user_id', state.user.id);

    if (error) throw error;
    showToast(completed ? '✓ Task completed!' : 'Task reopened.', completed ? 'success' : 'info');
  } catch (err) {
    // Revert
    task.completed = !completed;
    renderAll();
    showToast('Update failed: ' + err.message, 'error');
  }
}

// ──────────────────────────────────────────────────────────────
// FILTERING & SORTING
// ──────────────────────────────────────────────────────────────
function getFilteredTasks() {
  let tasks = [...state.tasks];
  const { status, priority, category, search, sort } = state.filter;

  if (status === 'pending')   tasks = tasks.filter(t => !t.completed);
  if (status === 'completed') tasks = tasks.filter(t => t.completed);
  if (priority !== 'all')     tasks = tasks.filter(t => t.priority === priority);
  if (category !== 'all')     tasks = tasks.filter(t => (t.category || 'Uncategorized') === category);

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    tasks = tasks.filter(t =>
      t.task.toLowerCase().includes(q) ||
      (t.category && t.category.toLowerCase().includes(q))
    );
  }

  // Sort
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  if (sort === 'due_date') {
    tasks.sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
  } else if (sort === 'priority') {
    tasks.sort((a, b) =>
      (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1)
    );
  } else {
    tasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  return tasks;
}

function setFilter(type, value) {
  state.filter[type] = value;

  // Update active button highlights
  document.querySelectorAll(`[data-filter="${type}"]`).forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === value);
  });

  renderTasks();
}

function setSort(value) {
  state.filter.sort = value;
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.classList.toggle('active-sort', btn.dataset.sort === value);
  });
  renderTasks();
}

function handleSearch(value) {
  state.filter.search = value;
  renderTasks();
}

function clearFilters() {
  state.filter.status   = 'all';
  state.filter.priority = 'all';
  state.filter.category = 'all';
  state.filter.search   = '';

  document.getElementById('search-input').value = '';

  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === 'all');
  });
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.classList.toggle('active-sort', btn.dataset.sort === 'created_at');
  });
  state.filter.sort = 'created_at';

  renderTasks();
}

// ──────────────────────────────────────────────────────────────
// RENDERING
// ──────────────────────────────────────────────────────────────
function renderAll() {
  renderStats();
  renderCategories();
  renderTasks();
}

function renderStats() {
  const total     = state.tasks.length;
  const completed = state.tasks.filter(t => t.completed).length;
  const pending   = state.tasks.filter(t => !t.completed).length;
  const today     = todayStr();
  const overdue   = state.tasks.filter(t => !t.completed && t.due_date && t.due_date < today).length;
  const pct       = total ? Math.round((completed / total) * 100) : 0;

  document.getElementById('stat-total').textContent     = total;
  document.getElementById('stat-completed').textContent = completed;
  document.getElementById('stat-pending').textContent   = pending;
  document.getElementById('stat-overdue').textContent   = overdue;
  document.getElementById('progress-pct').textContent   = pct + '%';
  document.getElementById('progress-fill').style.width  = pct + '%';
}

function renderCategories() {
  const cats = [
    ...new Set(
      state.tasks
        .map(t => t.category?.trim() || 'Uncategorized')
        .filter(Boolean)
    )
  ].sort();

  // Rebuild datalist
  document.getElementById('category-suggestions').innerHTML =
    cats.filter(c => c !== 'Uncategorized').map(c => `<option value="${esc(c)}">`).join('');

  // Rebuild sidebar category list
  document.getElementById('category-list').innerHTML = `
    <button onclick="setFilter('category','all')"
            data-filter="category" data-value="all"
            class="filter-btn ${state.filter.category === 'all' ? 'active' : ''}
                   w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm
                   text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
      All Categories
    </button>
    ${cats.map(cat => `
      <button onclick="setFilter('category', ${JSON.stringify(cat)})"
              data-filter="category" data-value="${esc(cat)}"
              class="filter-btn ${state.filter.category === cat ? 'active' : ''}
                     w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm
                     text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
        <span class="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0"></span>
        <span class="truncate">${esc(cat)}</span>
      </button>
    `).join('')}
  `;
}

function renderTasks() {
  const tasks    = getFilteredTasks();
  const listEl   = document.getElementById('task-list');
  const noTasks  = document.getElementById('empty-no-tasks');
  const noResult = document.getElementById('empty-no-results');
  const countEl  = document.getElementById('task-count-label');

  const total    = state.tasks.length;
  const filtered = tasks.length;

  countEl.textContent = filtered === total
    ? `${total} task${total !== 1 ? 's' : ''}`
    : `${filtered} of ${total} task${total !== 1 ? 's' : ''}`;

  noTasks.style.display  = 'none';
  noResult.style.display = 'none';

  if (tasks.length === 0) {
    listEl.innerHTML = '';
    if (total === 0) {
      noTasks.style.display = 'flex';
    } else {
      noResult.style.display = 'flex';
    }
    return;
  }

  listEl.innerHTML = tasks.map(renderTaskCard).join('');
}

function renderTaskCard(task) {
  const today      = todayStr();
  const isOverdue  = !task.completed && task.due_date && task.due_date < today;
  const isDueToday = !task.completed && task.due_date && task.due_date === today;

  const badgeClass = { high: 'badge-high', medium: 'badge-medium', low: 'badge-low' }[task.priority] ?? 'badge-low';
  const priorityLabel = task.priority
    ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1)
    : 'Low';

  const category  = task.category?.trim() || null;
  const dueDateFmt = task.due_date ? formatDate(task.due_date) : null;

  const dueLabel = isOverdue  ? `Overdue · ${dueDateFmt}`
                 : isDueToday ? `Due today`
                 : dueDateFmt ? dueDateFmt
                 : null;

  const dueColorClass = isOverdue  ? 'text-red-500 dark:text-red-400 font-medium'
                      : isDueToday ? 'text-amber-600 dark:text-amber-400 font-medium'
                      : 'text-gray-500 dark:text-gray-400';

  return `
    <div class="task-card group flex items-start gap-3.5 p-4
                bg-white dark:bg-gray-800 rounded-xl
                border ${task.completed
                  ? 'border-gray-100 dark:border-gray-700/60'
                  : 'border-gray-200 dark:border-gray-700'}
                shadow-sm hover:shadow-md transition-all duration-200
                ${task.completed ? 'opacity-70' : ''}"
         data-id="${task.id}">

      <!-- Checkbox -->
      <button onclick="toggleComplete('${task.id}', ${!task.completed})"
              class="check-btn flex-shrink-0 mt-0.5 w-5 h-5 rounded-full
                     border-2 transition-all duration-200
                     ${task.completed
                       ? 'bg-green-500 border-green-500 shadow-sm shadow-green-200 dark:shadow-green-900/30'
                       : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400'}
                     flex items-center justify-center"
              title="${task.completed ? 'Mark as pending' : 'Mark as completed'}">
        ${task.completed ? `
          <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
          </svg>
        ` : ''}
      </button>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <p class="text-sm sm:text-[15px] font-medium leading-snug break-words
                  ${task.completed
                    ? 'line-through text-gray-400 dark:text-gray-500'
                    : 'text-gray-900 dark:text-white'}">
          ${esc(task.task)}
        </p>

        <div class="flex items-center gap-2 mt-2 flex-wrap">
          <!-- Priority badge -->
          <span class="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeClass}">
            ${priorityLabel}
          </span>

          <!-- Category badge -->
          ${category ? `
            <span class="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full
                         bg-indigo-50 dark:bg-indigo-900/25 text-indigo-600 dark:text-indigo-400 font-medium">
              ${esc(category)}
            </span>
          ` : ''}

          <!-- Due date -->
          ${dueLabel ? `
            <span class="text-[11px] flex items-center gap-1 ${dueColorClass}">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              ${esc(dueLabel)}
            </span>
          ` : ''}
        </div>
      </div>

      <!-- Actions (visible on hover / focus) -->
      <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100
                  focus-within:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
        <button onclick="openModal('${task.id}')" title="Edit task"
                class="w-8 h-8 flex items-center justify-center rounded-lg
                       hover:bg-indigo-50 dark:hover:bg-indigo-900/30
                       text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5
                     m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
        <button onclick="openDeleteModal('${task.id}')" title="Delete task"
                class="w-8 h-8 flex items-center justify-center rounded-lg
                       hover:bg-red-50 dark:hover:bg-red-900/30
                       text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7
                     m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

// ──────────────────────────────────────────────────────────────
// TASK MODAL
// ──────────────────────────────────────────────────────────────
function openModal(taskId = null) {
  state.editingTaskId = taskId;

  const form    = document.getElementById('task-form');
  const errEl   = document.getElementById('modal-error');
  const titleEl = document.getElementById('modal-title');
  const subText = document.getElementById('modal-submit-text');

  form.reset();
  errEl.classList.add('hidden');

  if (taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    titleEl.textContent                                   = 'Edit Task';
    subText.textContent                                   = 'Save Changes';
    document.getElementById('modal-task').value         = task.task;
    document.getElementById('modal-priority').value     = task.priority ?? 'medium';
    document.getElementById('modal-due-date').value     = task.due_date ?? '';
    document.getElementById('modal-category').value     = task.category ?? '';
  } else {
    titleEl.textContent = 'Add New Task';
    subText.textContent = 'Add Task';
    // Reset submit button state in case previous submission was loading
    const btn = document.getElementById('modal-submit-btn');
    setButtonLoading(btn, false, 'Add Task');
  }

  document.getElementById('task-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('modal-task').focus(), 50);
}

function closeModal() {
  document.getElementById('task-modal').style.display = 'none';
  state.editingTaskId = null;
}

async function handleTaskSubmit(e) {
  e.preventDefault();

  const btn    = document.getElementById('modal-submit-btn');
  const errEl  = document.getElementById('modal-error');
  const isEdit = !!state.editingTaskId;

  const payload = {
    task:     document.getElementById('modal-task').value.trim(),
    priority: document.getElementById('modal-priority').value,
    due_date: document.getElementById('modal-due-date').value || null,
    category: document.getElementById('modal-category').value.trim() || null,
  };

  errEl.classList.add('hidden');

  if (!payload.task) {
    showFieldError(errEl, 'Task description is required.');
    return;
  }

  setButtonLoading(btn, true, isEdit ? 'Saving…' : 'Adding…');

  const ok = isEdit
    ? await updateTask(state.editingTaskId, payload)
    : await addTask(payload);

  if (ok) {
    closeModal();
  } else {
    setButtonLoading(btn, false, isEdit ? 'Save Changes' : 'Add Task');
  }
}

// ──────────────────────────────────────────────────────────────
// DELETE MODAL
// ──────────────────────────────────────────────────────────────
function openDeleteModal(id) {
  state.deletingTaskId = id;
  document.getElementById('delete-modal').style.display = 'flex';
}

function closeDeleteModal() {
  state.deletingTaskId = null;
  document.getElementById('delete-modal').style.display = 'none';
}

async function confirmDelete() {
  if (!state.deletingTaskId) return;
  const id = state.deletingTaskId;
  closeDeleteModal();
  await deleteTask(id);
}

// ──────────────────────────────────────────────────────────────
// DARK MODE
// ──────────────────────────────────────────────────────────────
function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  localStorage.setItem('darkMode', state.darkMode);
  applyDarkMode(state.darkMode);
}

function applyDarkMode(dark) {
  document.documentElement.classList.toggle('dark', dark);
  document.getElementById('icon-sun').classList.toggle('hidden', !dark);
  document.getElementById('icon-moon').classList.toggle('hidden', dark);
}

// ──────────────────────────────────────────────────────────────
// USER MENU
// ──────────────────────────────────────────────────────────────
function toggleUserMenu() {
  const dd = document.getElementById('user-dropdown');
  dd.classList.toggle('hidden');
}

function closeUserMenu() {
  document.getElementById('user-dropdown')?.classList.add('hidden');
}

// ──────────────────────────────────────────────────────────────
// MOBILE SIDEBAR
// ──────────────────────────────────────────────────────────────
function toggleSidebar(forceClose = null) {
  const sidebar  = document.getElementById('app-sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  const isOpen   = sidebar.classList.contains('open');
  const shouldOpen = forceClose === false ? false : !isOpen;

  sidebar.classList.toggle('open', shouldOpen);
  overlay.style.display = shouldOpen ? 'block' : 'none';
}

// ──────────────────────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ──────────────────────────────────────────────────────────────
const TOAST_COLORS = {
  success: 'bg-green-600',
  error:   'bg-red-600',
  info:    'bg-slate-700 dark:bg-slate-600',
  warning: 'bg-amber-500',
};
const TOAST_ICONS = {
  success: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>`,
  error:   `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>`,
  warning: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>`,
  info:    `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`,
};

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const color     = TOAST_COLORS[type] ?? TOAST_COLORS.info;
  const icon      = TOAST_ICONS[type]  ?? TOAST_ICONS.info;

  const toast = document.createElement('div');
  toast.className = `toast-enter pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl
                     text-white text-sm font-medium shadow-xl ${color}`;
  toast.innerHTML = `
    <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">${icon}</svg>
    <span class="flex-1 leading-snug">${esc(message)}</span>
    <button onclick="this.closest('[class*=toast]').remove()"
            class="ml-1 opacity-70 hover:opacity-100 flex-shrink-0 transition-opacity">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>
  `;

  container.appendChild(toast);

  // Auto-dismiss after 4 s
  setTimeout(() => {
    toast.classList.replace('toast-enter', 'toast-exit');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 4000);
}

// ──────────────────────────────────────────────────────────────
// LOADING
// ──────────────────────────────────────────────────────────────
function showTasksLoading(show) {
  document.getElementById('tasks-loading').style.display = show ? 'block' : 'none';
  document.getElementById('task-list').style.display     = show ? 'none'  : 'block';
  if (show) {
    document.getElementById('empty-no-tasks').style.display  = 'none';
    document.getElementById('empty-no-results').style.display = 'none';
    document.getElementById('task-count-label').textContent  = 'Loading…';
  }
}

// ──────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  // Parse as local date (avoid timezone offset issues)
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** HTML-escape a string to prevent XSS in innerHTML */
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showFieldError(el, message) {
  el.textContent = message;
  el.classList.remove('hidden');
}

function setButtonLoading(btn, loading, labelText) {
  const span = btn.querySelector('span');
  if (loading) {
    btn.disabled = true;
    btn.classList.add('opacity-75', 'cursor-not-allowed');
    if (span) span.textContent = labelText;
    if (!btn.querySelector('.btn-spinner')) {
      const s = document.createElement('div');
      s.className = 'btn-spinner spinner w-4 h-4 border-2';
      btn.insertBefore(s, btn.firstChild);
    }
  } else {
    btn.disabled = false;
    btn.classList.remove('opacity-75', 'cursor-not-allowed');
    if (span) span.textContent = labelText;
    btn.querySelector('.btn-spinner')?.remove();
  }
}

// ──────────────────────────────────────────────────────────────
// BOOT
// ──────────────────────────────────────────────────────────────
init();
