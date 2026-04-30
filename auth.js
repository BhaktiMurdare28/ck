/* ============================================================
   CORE KONSTRUCT — auth.js
   Role-based login, signup, session management, logout, theme toggle
   ============================================================ */

// ── Theme System ──────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('ck_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ck_theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const icons = document.querySelectorAll('.theme-icon');
  icons.forEach(el => {
    el.innerHTML = theme === 'dark' ? '<i class="fa-solid fa-sun"></i>️' : '<i class="fa-solid fa-moon"></i>';
  });
}

// Initialize theme immediately
initTheme();

// ── Demo credentials ──────────────────────────────────────────
const USERS = {
  admin: {
    email:    'admin@corekonstruct.com',
    password: 'admin123',
    name:     'Rajesh Kumar',
    role:     'Contractor / Admin',
    roleKey:  'admin',
    initials: 'RK',
    dashboard:'dashboard-admin.html'
  },
  supervisor: {
    email:    'supervisor@corekonstruct.com',
    password: 'super123',
    name:     'Arjun Singh',
    role:     'Site Supervisor',
    roleKey:  'supervisor',
    initials: 'AS',
    dashboard:'dashboard-supervisor.html'
  },
  client: {
    email:    'client@corekonstruct.com',
    password: 'client123',
    name:     'Priya Mehta',
    role:     'Client',
    roleKey:  'client',
    initials: 'PM',
    dashboard:'dashboard-client.html'
  }
};

// ── Auto-redirect if already logged in ────────────────────────
(function autoRedirect() {
  // Only on login page
  const isLoginPage = document.getElementById('login-form');
  if (!isLoginPage) return;
  
  const raw = sessionStorage.getItem('ck_user');
  if (raw) {
    try {
      const user = JSON.parse(raw);
      const dashboards = {
        admin: 'dashboard-admin.html',
        supervisor: 'dashboard-supervisor.html',
        client: 'dashboard-client.html'
      };
      const target = dashboards[user.roleKey];
      if (target) {
        window.location.href = target;
        return;
      }
    } catch (e) {
      sessionStorage.removeItem('ck_user');
    }
  }
})();

// ── Auth Mode Toggle (Login / Signup) ─────────────────────────
const toggleLoginBtn  = document.getElementById('toggle-login');
const toggleSignupBtn = document.getElementById('toggle-signup');
const loginSection    = document.getElementById('login-section');
const signupSection   = document.getElementById('signup-section');
const switchToSignup  = document.getElementById('switch-to-signup');
const switchToLogin   = document.getElementById('switch-to-login');

function showLoginMode() {
  if (toggleLoginBtn)  toggleLoginBtn.classList.add('active');
  if (toggleSignupBtn) toggleSignupBtn.classList.remove('active');
  if (loginSection)  { loginSection.style.display = 'block'; loginSection.classList.add('active'); }
  if (signupSection) { signupSection.style.display = 'none'; signupSection.classList.remove('active'); }
}

function showSignupMode() {
  if (toggleSignupBtn) toggleSignupBtn.classList.add('active');
  if (toggleLoginBtn)  toggleLoginBtn.classList.remove('active');
  if (signupSection) { signupSection.style.display = 'block'; signupSection.classList.add('active'); }
  if (loginSection)  { loginSection.style.display = 'none'; loginSection.classList.remove('active'); }
}

if (toggleLoginBtn)  toggleLoginBtn.addEventListener('click', showLoginMode);
if (toggleSignupBtn) toggleSignupBtn.addEventListener('click', showSignupMode);
if (switchToSignup)  switchToSignup.addEventListener('click', (e) => { e.preventDefault(); showSignupMode(); });
if (switchToLogin)   switchToLogin.addEventListener('click', (e) => { e.preventDefault(); showLoginMode(); });

// Auto-show signup if URL hash is #signup
if (window.location.hash === '#signup') {
  showSignupMode();
}

// ── Login Page Logic ──────────────────────────────────────────
const loginForm  = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const roleTabBtns = document.querySelectorAll('.role-tab');

let activeRole = 'admin';



if (roleTabBtns.length) {
  roleTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      roleTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeRole = btn.dataset.role;
    });
  });
}

// Toggle password visibility — Login
const pwToggle = document.getElementById('toggle-pw');
const pwField  = document.getElementById('login-password');
if (pwToggle && pwField) {
  pwToggle.addEventListener('click', () => {
    pwField.type = pwField.type === 'password' ? 'text' : 'password';
    pwToggle.textContent = pwField.type === 'password' ? '👁' : '🙈';
  });
}

// Toggle password visibility — Signup
const signupPwToggle = document.getElementById('toggle-signup-pw');
const signupPwField  = document.getElementById('signup-password');
if (signupPwToggle && signupPwField) {
  signupPwToggle.addEventListener('click', () => {
    signupPwField.type = signupPwField.type === 'password' ? 'text' : 'password';
    signupPwToggle.textContent = signupPwField.type === 'password' ? '👁' : '🙈';
  });
}

// Login submit
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pw    = document.getElementById('login-password').value;
    const user  = USERS[activeRole];

    // Try API authentication first, fall back to demo credentials
    let authenticated = false;
    let loggedInRoleKey = activeRole;

    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pw })
      });
      if (resp.ok) {
        const data = await resp.json();
        // Determine role key
        loggedInRoleKey = data.user.roleKey || data.user.role || activeRole;
        // Store the JWT token for API calls
        sessionStorage.setItem('ck_token', data.token);
        sessionStorage.setItem('ck_user', JSON.stringify({
          name:     data.user.name,
          role:     data.user.roleLabel || data.user.role,
          roleKey:  loggedInRoleKey,
          initials: data.user.initials
        }));
        authenticated = true;
      }
    } catch (err) {
      console.warn('API login unavailable, trying demo credentials');
    }

    // Fallback to hardcoded demo credentials — check ALL roles, not just the active tab
    if (!authenticated) {
      const matchedRole = Object.values(USERS).find(u => u.email === email && u.password === pw);
      if (matchedRole) {
        sessionStorage.setItem('ck_user', JSON.stringify({
          name:     matchedRole.name,
          role:     matchedRole.role,
          roleKey:  matchedRole.roleKey,
          initials: matchedRole.initials
        }));
        loggedInRoleKey = matchedRole.roleKey;
        authenticated = true;
      }
    }

    if (authenticated) {
      // Determine correct dashboard
      const dashboards = {
        admin: 'dashboard-admin.html',
        supervisor: 'dashboard-supervisor.html',
        client: 'dashboard-client.html'
      };
      const targetDashboard = dashboards[loggedInRoleKey] || user.dashboard;

      // Animate redirect
      document.body.style.opacity = '0';
      document.body.style.transition = 'opacity 0.4s';
      setTimeout(() => { window.location.href = targetDashboard; }, 400);
    } else {
      loginError.classList.add('show');
      loginError.textContent = '<i class="fa-solid fa-triangle-exclamation"></i> Invalid credentials. Please check email and password.';
      setTimeout(() => loginError.classList.remove('show'), 4000);
    }
  });
}

// ── Signup Form Logic ─────────────────────────────────────────
const signupForm    = document.getElementById('signup-form');
const signupError   = document.getElementById('signup-error');
const signupSuccess = document.getElementById('signup-success');
const roleOptions   = document.querySelectorAll('.signup-role-option');

let selectedSignupRole = 'admin';

if (roleOptions.length) {
  roleOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      roleOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedSignupRole = opt.dataset.role;
    });
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name     = document.getElementById('signup-name').value.trim();
    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    // Validation
    if (!name || !email || !password) {
      showSignupError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      showSignupError('Password must be at least 6 characters.');
      return;
    }

    // Disable submit
    const submitBtn = document.getElementById('signup-submit');
    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = 'Creating Account...';

    try {
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role: selectedSignupRole })
      });

      const data = await resp.json();

      if (resp.ok) {
        // Store token and user info
        sessionStorage.setItem('ck_token', data.token);
        sessionStorage.setItem('ck_user', JSON.stringify({
          name:     data.user.name,
          role:     data.user.roleLabel || data.user.role,
          roleKey:  data.user.roleKey || data.user.role,
          initials: data.user.initials
        }));

        // Show success
        if (signupSuccess) {
          signupSuccess.textContent = '<i class="fa-solid fa-circle-check"></i> Account created successfully! Redirecting...';
          signupSuccess.classList.add('show');
        }
        if (signupError) signupError.classList.remove('show');

        // Redirect to appropriate dashboard
        const dashboards = {
          admin: 'dashboard-admin.html',
          supervisor: 'dashboard-supervisor.html',
          client: 'dashboard-client.html'
        };
        const targetDashboard = dashboards[data.user.roleKey || data.user.role] || 'dashboard-admin.html';

        setTimeout(() => {
          document.body.style.opacity = '0';
          document.body.style.transition = 'opacity 0.4s';
          setTimeout(() => { window.location.href = targetDashboard; }, 400);
        }, 1000);
      } else {
        showSignupError(data.error || 'Registration failed. Please try again.');
        submitBtn.disabled = false;
        submitBtn.querySelector('span').textContent = 'Create Account';
      }
    } catch (err) {
      showSignupError('Server unavailable. Please make sure the server is running.');
      submitBtn.disabled = false;
      submitBtn.querySelector('span').textContent = 'Create Account';
    }
  });
}

function showSignupError(msg) {
  if (signupError) {
    signupError.textContent = '<i class="fa-solid fa-triangle-exclamation"></i> ' + msg;
    signupError.classList.add('show');
    setTimeout(() => signupError.classList.remove('show'), 5000);
  }
  if (signupSuccess) signupSuccess.classList.remove('show');
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
  sessionStorage.removeItem('ck_token');
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
window.toggleTheme    = toggleTheme;
window.initTheme      = initTheme;
