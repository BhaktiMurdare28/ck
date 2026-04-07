/* ============================================================
   CORE KONSTRUCT — auth.js
   Role-based login, session management, logout
   ============================================================ */

// Demo credentials
const USERS = {
  admin: {
    email:    'admin@corekonstruct.com',
    password: 'admin123',
    name:     'Rajesh Kumar',
    role:     'Contractor / Admin',
    initials: 'RK',
    dashboard:'dashboard-admin.html'
  },
  supervisor: {
    email:    'supervisor@corekonstruct.com',
    password: 'super123',
    name:     'Arjun Singh',
    role:     'Site Supervisor',
    initials: 'AS',
    dashboard:'dashboard-supervisor.html'
  },
  client: {
    email:    'client@corekonstruct.com',
    password: 'client123',
    name:     'Priya Mehta',
    role:     'Client',
    initials: 'PM',
    dashboard:'dashboard-client.html'
  }
};

// ── Login Page Logic ──────────────────────────────────────────
const loginForm  = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const roleTabBtns = document.querySelectorAll('.role-tab');
const demoHint   = document.getElementById('demo-hint');

let activeRole = 'admin';

// Set demo hints
const hints = {
  admin:      'admin@corekonstruct.com / admin123',
  supervisor: 'supervisor@corekonstruct.com / super123',
  client:     'client@corekonstruct.com / client123'
};

function updateDemoHint(role) {
  if (demoHint) {
    demoHint.innerHTML = `Demo: <strong>${hints[role]}</strong>`;
  }
}

if (roleTabBtns.length) {
  roleTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      roleTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeRole = btn.dataset.role;
      updateDemoHint(activeRole);
      // Prefill email
      const emailField = document.getElementById('login-email');
      if (emailField) emailField.value = USERS[activeRole].email;
    });
  });
  updateDemoHint(activeRole);
}

// Toggle password visibility
const pwToggle = document.getElementById('toggle-pw');
const pwField  = document.getElementById('login-password');
if (pwToggle && pwField) {
  pwToggle.addEventListener('click', () => {
    pwField.type = pwField.type === 'password' ? 'text' : 'password';
    pwToggle.textContent = pwField.type === 'password' ? '👁' : '🙈';
  });
}

// Login submit
if (loginForm) {
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pw    = document.getElementById('login-password').value;
    const user  = USERS[activeRole];

    if (email === user.email && pw === user.password) {
      // Save session
      sessionStorage.setItem('ck_user', JSON.stringify({
        name:     user.name,
        role:     user.role,
        roleKey:  activeRole,
        initials: user.initials
      }));
      // Animate redirect
      document.body.style.opacity = '0';
      document.body.style.transition = 'opacity 0.4s';
      setTimeout(() => { window.location.href = user.dashboard; }, 400);
    } else {
      loginError.classList.add('show');
      loginError.textContent = '⚠ Invalid credentials. Please check email and password.';
      setTimeout(() => loginError.classList.remove('show'), 4000);
    }
  });
}

// ── Auth Guard (call on dashboard pages) ─────────────────────
function authGuard(requiredRole) {
  const raw = sessionStorage.getItem('ck_user');
  if (!raw) {
    window.location.href = 'login.html';
    return null;
  }
  const user = JSON.parse(raw);
  if (requiredRole && user.roleKey !== requiredRole) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

// ── Fill sidebar user info ─────────────────────────────────────
function fillSidebarUser() {
  const raw = sessionStorage.getItem('ck_user');
  if (!raw) return;
  const user = JSON.parse(raw);
  const nameEl     = document.getElementById('sidebar-name');
  const roleEl     = document.getElementById('sidebar-role');
  const initEl     = document.getElementById('sidebar-initials');
  const topbarName = document.getElementById('topbar-user');
  if (nameEl)     nameEl.textContent = user.name;
  if (roleEl)     roleEl.textContent = user.role;
  if (initEl)     initEl.textContent = user.initials;
  if (topbarName) topbarName.textContent = user.name;
}

// ── Logout ────────────────────────────────────────────────────
function logout() {
  sessionStorage.removeItem('ck_user');
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.3s';
  setTimeout(() => { window.location.href = 'login.html'; }, 300);
}

// ── Sidebar collapse toggle ────────────────────────────────────
function initSidebar() {
  const sidebar   = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const overlay   = document.getElementById('sidebar-overlay');
  const mobileTrigger = document.getElementById('mobile-sidebar-trigger');

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  // Mobile overlay
  if (mobileTrigger && sidebar && overlay) {
    mobileTrigger.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      overlay.classList.toggle('show');
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('show');
    });
  }
}

// ── Active nav item ────────────────────────────────────────────
function setActiveNav(id) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.nav === id);
  });
}

// ── Expose globally ────────────────────────────────────────────
window.authGuard      = authGuard;
window.fillSidebarUser= fillSidebarUser;
window.logout         = logout;
window.initSidebar    = initSidebar;
window.setActiveNav   = setActiveNav;
