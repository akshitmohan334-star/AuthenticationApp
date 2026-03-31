const API = '/api';

function getToken() { return localStorage.getItem('token'); }
function getUser() {
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}
function setAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}
function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function isLoggedIn() { return !!getToken(); }
function isAdmin() { const u = getUser(); return u && u.role === 'admin'; }

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}), ...options.headers };
  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function showAlert(id, message, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.className = `alert alert-${type} show`;
  setTimeout(() => el.classList.remove('show'), 5000);
}

function renderNav() {
  const nav = document.getElementById('nav-dynamic');
  if (!nav) return;
  const user = getUser();
  const logged = isLoggedIn();
  const admin = isAdmin();
  const page = window.location.pathname.split('/').pop() || 'index.html';
  let html = '';
  html += `<li><a href="index.html" class="${page === 'index.html' ? 'active' : ''}">Home</a></li>`;
  if (logged) {
    html += `<li><a href="info.html" class="${page === 'info.html' ? 'active' : ''}">Info</a></li>`;
  }
  if (admin) {
    html += `<li><a href="admin.html" class="${page === 'admin.html' ? 'active' : ''}">Manage Users</a></li>`;
  }
  if (!logged) {
    html += `<li><a href="login.html" class="${page === 'login.html' ? 'nav-accent' : ''}">Login</a></li>`;
    html += `<li><a href="register.html" class="${page === 'register.html' ? 'active' : ''}">Register</a></li>`;
  } else {
    html += `<li class="nav-user-info">Logged in as <span>${user.username}</span> ${admin ? '· <span style="color:var(--admin-color)">admin</span>' : ''}</li>`;
    html += `<li><button onclick="logout()">Logout</button></li>`;
  }
  nav.innerHTML = html;
}

function logout() {
  clearAuth();
  window.location.href = 'index.html';
}

function requireAuth() {
  if (!isLoggedIn()) {
    showAccessDenied('You must be logged in to view this page.', true);
    return false;
  }
  return true;
}

function requireAdmin() {
  if (!isLoggedIn()) {
    showAccessDenied('You must be logged in to view this page.', true);
    return false;
  }
  if (!isAdmin()) {
    showAccessDenied('You need administrator privileges to view this page.', false);
    return false;
  }
  return true;
}

function showAccessDenied(msg, showLogin) {
  const main = document.getElementById('main-content');
  if (!main) return;
  main.innerHTML = `
    <div class="access-denied fade-in">
      <div class="access-denied-code">403</div>
      <h2>Access Denied</h2>
      <p>${msg}</p>
      <div class="btn-group">
        <a href="index.html" class="btn btn-outline">← Back to Home</a>
        ${showLogin ? '<a href="login.html" class="btn btn-primary">Login</a>' : ''}
      </div>
    </div>
  `;
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirm = document.getElementById('confirm').value;
  if (!username || !email || !password) return showAlert('alert', 'All fields are required.');
  if (password !== confirm) return showAlert('alert', 'Passwords do not match.');
  if (password.length < 6) return showAlert('alert', 'Password must be at least 6 characters.');
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Creating account...';
  try {
    await apiFetch('/register', { method: 'POST', body: JSON.stringify({ username, email, password }) });
    showAlert('alert', 'Account created successfully! Redirecting...', 'success');
    setTimeout(() => window.location.href = 'login.html', 1500);
  } catch (err) {
    showAlert('alert', err.message);
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) return showAlert('alert', 'Email and password are required.');
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Signing in...';
  try {
    const data = await apiFetch('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setAuth(data.token, data.user);
    showAlert('alert', 'Welcome back! Redirecting...', 'success');
    setTimeout(() => window.location.href = data.user.role === 'admin' ? 'admin.html' : 'info.html', 1000);
  } catch (err) {
    showAlert('alert', err.message);
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

async function loadInfoPage() {
  if (!requireAuth()) return;
  const user = getUser();
  const content = document.getElementById('info-content');
  if (!content) return;
  const joined = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  content.innerHTML = `
    <div class="page fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <h2>Welcome back, ${user.username}</h2>
          <p>Your personal dashboard and account information</p>
        </div>
        <span class="badge badge-${user.role}">${user.role}</span>
      </div>
      <div class="info-grid">
        <div class="info-block">
          <div class="info-block-label">Username</div>
          <div class="info-block-value">${user.username}</div>
          <div class="info-block-sub">Your unique identifier</div>
        </div>
        <div class="info-block">
          <div class="info-block-label">Email Address</div>
          <div class="info-block-value" style="font-size:1.1rem">${user.email}</div>
          <div class="info-block-sub">Account email on file</div>
        </div>
        <div class="info-block">
          <div class="info-block-label">Account Role</div>
          <div class="info-block-value" style="color:${user.role === 'admin' ? 'var(--admin-color)' : 'var(--user-color)'}">${user.role}</div>
          <div class="info-block-sub">${user.role === 'admin' ? 'Full administrative access' : 'Standard user access'}</div>
        </div>
        <div class="info-block">
          <div class="info-block-label">Session Status</div>
          <div class="info-block-value" style="color:var(--success);font-size:1rem">● Active</div>
          <div class="info-block-sub">JWT token valid · 24h expiry</div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="feature-card" style="max-width:500px">
        <div class="feature-icon">🔐</div>
        <h3>Secure Session</h3>
        <p>Your session is secured with a JWT token stored in localStorage. This token expires in 24 hours and authenticates all protected API requests.</p>
      </div>
    </div>
  `;
}

async function loadAdminPage() {
  if (!requireAdmin()) return;
  const content = document.getElementById('admin-content');
  if (!content) return;
  content.innerHTML = `
    <div class="page fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <h2>User Management</h2>
          <p>View and manage all registered users</p>
        </div>
      </div>
      <div class="stats-row" id="stats-row">
        <div class="stat-card"><div class="stat-number" id="stat-total">—</div><div class="stat-label">Total Users</div></div>
        <div class="stat-card"><div class="stat-number" id="stat-admins">—</div><div class="stat-label">Admins</div></div>
        <div class="stat-card"><div class="stat-number" id="stat-users">—</div><div class="stat-label">Regular Users</div></div>
      </div>
      <div class="users-table-wrapper">
        <div class="loading" id="users-loading">Loading users</div>
        <table class="users-table" id="users-table" style="display:none">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="users-tbody"></tbody>
        </table>
      </div>
    </div>
  `;
  await fetchUsers();
}

async function fetchUsers() {
  try {
    const users = await apiFetch('/users');
    const tbody = document.getElementById('users-tbody');
    const table = document.getElementById('users-table');
    const loading = document.getElementById('users-loading');
    const currentUser = getUser();
    document.getElementById('stat-total').textContent = users.length;
    document.getElementById('stat-admins').textContent = users.filter(u => u.role === 'admin').length;
    document.getElementById('stat-users').textContent = users.filter(u => u.role === 'user').length;
    loading.style.display = 'none';
    table.style.display = 'table';
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No users found</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(u => `
      <tr id="row-${u._id}">
        <td>
          <div class="user-name-cell">
            <div class="user-avatar">${u.username.charAt(0).toUpperCase()}</div>
            <div>
              <div class="user-name">${u.username}</div>
              ${u._id === currentUser.id ? '<div style="font-size:0.65rem;color:var(--accent);margin-top:2px">· you</div>' : ''}
            </div>
          </div>
        </td>
        <td class="user-email">${u.email}</td>
        <td><span class="badge badge-${u.role}">${u.role}</span></td>
        <td>${new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
        <td>
          ${u._id !== currentUser.id
            ? `<button class="btn btn-danger" onclick="deleteUser('${u._id}', '${u.username}')">Delete</button>`
            : '<span style="font-size:0.7rem;color:var(--text-dim)">—</span>'
          }
        </td>
      </tr>
    `).join('');
  } catch (err) {
    const loading = document.getElementById('users-loading');
    if (loading) loading.textContent = 'Failed to load users: ' + err.message;
  }
}

async function deleteUser(id, username) {
  if (!confirm(`Delete user "${username}"? This action cannot be undone.`)) return;
  try {
    await apiFetch(`/users/${id}`, { method: 'DELETE' });
    const row = document.getElementById(`row-${id}`);
    if (row) {
      row.style.opacity = '0';
      row.style.transition = 'opacity 0.3s';
      setTimeout(() => { row.remove(); fetchUsers(); }, 300);
    }
  } catch (err) {
    alert('Error deleting user: ' + err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  const page = window.location.pathname.split('/').pop() || 'index.html';
  if (page === 'register.html') {
    const form = document.getElementById('register-form');
    if (form) form.addEventListener('submit', handleRegister);
    if (isLoggedIn()) window.location.href = 'info.html';
  }
  if (page === 'login.html') {
    const form = document.getElementById('login-form');
    if (form) form.addEventListener('submit', handleLogin);
    if (isLoggedIn()) window.location.href = isAdmin() ? 'admin.html' : 'info.html';
  }
  if (page === 'info.html') loadInfoPage();
  if (page === 'admin.html') loadAdminPage();
  if (page === 'index.html' || page === '') {
    const navCta = document.getElementById('nav-cta');
    if (navCta) {
      if (isLoggedIn()) {
        navCta.innerHTML = `<a href="${isAdmin() ? 'admin.html' : 'info.html'}" class="btn btn-primary">Go to Dashboard →</a>`;
      } else {
        navCta.innerHTML = `
          <a href="register.html" class="btn btn-primary">Get Started →</a>
          <a href="login.html" class="btn btn-outline">Sign In</a>
        `;
      }
    }
  }
});
