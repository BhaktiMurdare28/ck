/**
 * CORE KONSTRUCT — build-client.js
 * Assembles client.html from all existing source files (no logic changes).
 * Run: node build-client.js
 */

const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

function read(filePath) {
  return fs.readFileSync(path.join(ROOT, filePath), 'utf8');
}

// ── Read all CSS ──────────────────────────────────────────────
const cssMain       = read('css/main.css');
const cssLanding    = read('css/landing.css');
const cssAuth       = read('css/auth.css');
const cssDashboard  = read('css/dashboard.css');
const cssBlog       = read('css/blog.css');

// ── Read all JS ───────────────────────────────────────────────
const jsMain        = read('js/main.js');
const jsAuth        = read('js/auth.js');
const jsAdmin       = read('js/admin.js');
let   jsSupervisor  = read('js/supervisor.js');
const jsClient      = read('js/client.js');

// Fix typo on line 1 of supervisor.js (s2a/* → /*)
jsSupervisor = jsSupervisor.replace(/^s2a/, '');

// ── Extract <body> content from HTML files ────────────────────
function extractBody(html) {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return m ? m[1].trim() : html;
}

const bodyLanding    = extractBody(read('index.html'));
const bodyLogin      = extractBody(read('login.html'));
const bodyAdmin      = extractBody(read('dashboard-admin.html'));
const bodySupervisor = extractBody(read('dashboard-supervisor.html'));
const bodyClient     = extractBody(read('dashboard-client.html'));
const bodyBlog       = extractBody(read('blog.html'));

// ── SPA routing replacements ──────────────────────────────────
// Replace window.location.href navigation with showView()
function fixNavJS(src) {
  return src
    .replace(/window\.location\.href\s*=\s*['"]login\.html['"]/g,        "showView('login')")
    .replace(/window\.location\.href\s*=\s*['"]index\.html['"]/g,        "showView('landing')")
    .replace(/window\.location\.href\s*=\s*['"]blog\.html['"]/g,         "showView('blog')")
    .replace(/window\.location\.href\s*=\s*['"]dashboard-admin\.html['"]/g,      "showView('admin')")
    .replace(/window\.location\.href\s*=\s*['"]dashboard-supervisor\.html['"]/g, "showView('supervisor')")
    .replace(/window\.location\.href\s*=\s*['"]dashboard-client\.html['"]/g,     "showView('client-dash')");
}

// Replace href links in HTML with onclick showView
function fixNavHTML(src) {
  return src
    .replace(/href="login\.html"/g,                 "href=\"#\" onclick=\"showView('login');return false;\"")
    .replace(/href="index\.html"/g,                 "href=\"#\" onclick=\"showView('landing');return false;\"")
    .replace(/href="blog\.html"/g,                  "href=\"#\" onclick=\"showView('blog');return false;\"")
    .replace(/href="dashboard-admin\.html"/g,        "href=\"#\" onclick=\"showView('admin');return false;\"")
    .replace(/href="dashboard-supervisor\.html"/g,   "href=\"#\" onclick=\"showView('supervisor');return false;\"")
    .replace(/href="dashboard-client\.html"/g,       "href=\"#\" onclick=\"showView('client-dash');return false;\"");
}

// Fix USERS dashboard values in auth.js
let authFixed = jsAuth
  .replace(/'dashboard-admin\.html'/g,      "'admin'")
  .replace(/'dashboard-supervisor\.html'/g, "'supervisor'")
  .replace(/'dashboard-client\.html'/g,     "'client-dash'")
  .replace(/window\.location\.href\s*=\s*user\.dashboard/g, "showView(user.dashboard)");
authFixed = fixNavJS(authFixed);

// Fix remaining nav in other JS files
const jsSuperFixed = fixNavJS(jsSupervisor);
const jsAdminFixed = fixNavJS(jsAdmin);
const jsClientFixed = fixNavJS(jsClient);
const jsMainFixed  = fixNavJS(jsMain);

// Fix HTML nav links
const landingFixed    = fixNavHTML(bodyLanding);
const loginFixed      = fixNavHTML(bodyLogin);
const adminFixed      = fixNavHTML(bodyAdmin);
const supervisorFixed = fixNavHTML(bodySupervisor);
const clientFixed     = fixNavHTML(bodyClient);
const blogFixed       = fixNavHTML(bodyBlog);

// ── SPA showView() controller ─────────────────────────────────
const spaRouter = `
/* ============================================================
   CORE KONSTRUCT — SPA Router
   ============================================================ */
var _currentView = 'landing';

function showView(name) {
  var views = ['landing','login','admin','supervisor','client-dash','blog'];
  views.forEach(function(v) {
    var el = document.getElementById('view-' + v);
    if (el) el.style.display = 'none';
  });
  var target = document.getElementById('view-' + name);
  if (target) {
    target.style.display = 'block';
    _currentView = name;
    window.scrollTo(0, 0);
  }
  // Re-run scroll reveal when landing is shown
  if (name === 'landing') {
    setTimeout(function() {
      var els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
      if (els.length && window.IntersectionObserver) {
        var obs = new IntersectionObserver(function(entries) {
          entries.forEach(function(e) {
            if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
          });
        }, { threshold: 0.12 });
        els.forEach(function(el) { el.classList.remove('visible'); obs.observe(el); });
      }
    }, 50);
  }
}
window.showView = showView;
`;

// ── Assemble client.html ──────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Core Konstruct — Smart Construction Monitoring System</title>
  <meta name="description" content="Core Konstruct is a premium construction monitoring platform for contractors, supervisors, and clients.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
/* ============================================================
   main.css
   ============================================================ */
${cssMain}

/* ============================================================
   landing.css
   ============================================================ */
${cssLanding}

/* ============================================================
   auth.css
   ============================================================ */
${cssAuth}

/* ============================================================
   dashboard.css
   ============================================================ */
${cssDashboard}

/* ============================================================
   blog.css
   ============================================================ */
${cssBlog}

/* ── SPA view wrapper ── */
.view-section { display: none; }
  </style>
</head>
<body>

<!-- ████ VIEW: LANDING ████ -->
<div id="view-landing" class="view-section">
${landingFixed}
</div>

<!-- ████ VIEW: LOGIN ████ -->
<div id="view-login" class="view-section">
${loginFixed}
</div>

<!-- ████ VIEW: ADMIN DASHBOARD ████ -->
<div id="view-admin" class="view-section">
${adminFixed}
</div>

<!-- ████ VIEW: SUPERVISOR DASHBOARD ████ -->
<div id="view-supervisor" class="view-section">
${supervisorFixed}
</div>

<!-- ████ VIEW: CLIENT DASHBOARD ████ -->
<div id="view-client-dash" class="view-section">
${clientFixed}
</div>

<!-- ████ VIEW: BLOG ████ -->
<div id="view-blog" class="view-section">
${blogFixed}
</div>

<script>
/* ============================================================
   SPA Router
   ============================================================ */
${spaRouter}

/* ============================================================
   main.js
   ============================================================ */
${jsMainFixed}

/* ============================================================
   auth.js
   ============================================================ */
${authFixed}

/* ============================================================
   admin.js
   ============================================================ */
${jsAdminFixed}

/* ============================================================
   supervisor.js
   ============================================================ */
${jsSuperFixed}

/* ============================================================
   client.js
   ============================================================ */
${jsClientFixed}

/* ── Boot: show landing view ── */
showView('landing');
</script>
</body>
</html>`;

// ── Write output ──────────────────────────────────────────────
fs.writeFileSync(path.join(ROOT, 'client.html'), html, 'utf8');
const size = (fs.statSync(path.join(ROOT, 'client.html')).size / 1024).toFixed(1);
console.log('\n  ✅  client.html created successfully!');
console.log(\`  📦  File size: \${size} KB\`);
console.log('  🌐  Run: node server.js then open http://localhost:3000\n');
