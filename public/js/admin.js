/* ============================================================
   CORE KONSTRUCT — admin.js
   Admin/Contractor dashboard logic
   NOW FETCHES LIVE DATA FROM API
   ============================================================ */

// ── Global State for Export ──────────────────────────────────
let ATTENDANCE_ADMIN = [];
let SANCTION_DOCS = [];

// ── Helpers ───────────────────────────────────────────────────
function getToken() {
  return sessionStorage.getItem('ck_token') || '';
}
function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getToken()
  };
}

// ── Sample project data ───────────────────────────────────────
const PROJECTS_DATA = [
  {
    id: 1,
    name: 'City Center Complex',
    type: 'Building',
    location: 'Mumbai, MH',
    supervisor: 'Arjun Singh',
    budget: 4200000,
    spent: 2870000,
    labour: 980000,
    material: 1600000,
    misc: 290000,
    progress: 68,
    status: 'on-track',
    startDate: '2025-03-01',
    endDate: '2026-06-30',
    stages: [
      { name: 'Foundation',   pct: 100, status: 'done' },
      { name: 'Structure',    pct: 100, status: 'done' },
      { name: 'Brickwork',    pct: 85,  status: 'active' },
      { name: 'Plastering',   pct: 20,  status: 'pending' },
      { name: 'Finishing',    pct: 0,   status: 'pending' },
      { name: 'Handover',     pct: 0,   status: 'pending' }
    ],
    image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?q=80&w=600'
  },
  {
    id: 2,
    name: 'NH-48 Road Expansion',
    type: 'Road',
    location: 'Pune – Nashik Highway',
    supervisor: 'Arjun Singh',
    budget: 7500000,
    spent: 3100000,
    labour: 1200000,
    material: 1700000,
    misc: 200000,
    progress: 41,
    status: 'on-track',
    startDate: '2025-06-01',
    endDate: '2026-12-31',
    stages: [
      { name: 'Survey',     pct: 100, status: 'done' },
      { name: 'Earthwork',  pct: 100, status: 'done' },
      { name: 'Sub-base',   pct: 60,  status: 'active' },
      { name: 'Base Course',pct: 10,  status: 'pending' },
      { name: 'Surfacing',  pct: 0,   status: 'pending' }
    ],
    image: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?q=80&w=600'
  },
  {
    id: 3,
    name: 'Residency Park Bridge',
    type: 'Bridge',
    location: 'Thane, MH',
    supervisor: 'Arjun Singh',
    budget: 9800000,
    spent: 8200000,
    labour: 3100000,
    material: 4500000,
    misc: 600000,
    progress: 84,
    status: 'delayed',
    startDate: '2024-09-01',
    endDate: '2026-03-31',
    stages: [
      { name: 'Piling',       pct: 100, status: 'done' },
      { name: 'Abutments',    pct: 100, status: 'done' },
      { name: 'Deck Slab',    pct: 100, status: 'done' },
      { name: 'Railings',     pct: 80,  status: 'active' },
      { name: 'Finishing',    pct: 30,  status: 'pending' }
    ],
    image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=600'
  }
];

/* ── Fetch live project data from API ──────────────────────────
   Merges API data over the hardcoded defaults so supervisor
   updates (progress, stages) appear on the admin dashboard.   */
async function loadProjectsFromAPI() {
  try {
    const raw = getToken();
    if (!raw) return;
    const res = await fetch('/api/projects', { headers: apiHeaders() });
    if (!res.ok) return;
    const apiProjects = await res.json();

    apiProjects.forEach(ap => {
      const match = PROJECTS_DATA.find(p => p.name === ap.name);
      if (match) {
        match.progress = ap.progress ?? match.progress;
        match.status   = ap.status   ?? match.status;
        match.spent    = ap.spent    ?? match.spent;
        match.labour   = ap.labour   ?? match.labour;
        match.material = ap.material ?? match.material;
        match.misc     = ap.misc     ?? match.misc;
        if (ap.image) match.image = ap.image;
        if (ap.supervisor) match.supervisor = ap.supervisor;
        if (ap.budget) match.budget = ap.budget;
        if (ap.startDate) match.startDate = ap.startDate;
        if (ap.endDate) match.endDate = ap.endDate;
        if (ap.location) match.location = ap.location;
        if (ap.type) match.type = ap.type;
        if (ap.stages && ap.stages.length) match.stages = ap.stages;
      } else {
        PROJECTS_DATA.push({
          id: PROJECTS_DATA.length + 1,
          name: ap.name,
          type: ap.type || 'Building',
          location: ap.location || 'TBD',
          supervisor: ap.supervisor || 'Unassigned',
          budget: ap.budget || 0,
          spent: ap.spent || 0,
          labour: ap.labour || 0,
          material: ap.material || 0,
          misc: ap.misc || 0,
          progress: ap.progress || 0,
          status: ap.status || 'on-track',
          startDate: ap.startDate || '',
          endDate: ap.endDate || '',
          stages: ap.stages || [],
          image: ap.image || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600'
        });
      }
    });
    
    // Refresh stats and overview after loading live data
    renderStats();
  } catch (err) {
    console.warn('Could not load projects from API, using defaults:', err.message);
  }
}

// Also check localStorage as a fallback for offline use
const savedProg = localStorage.getItem('ck_city_complex_prog');
if (savedProg) {
  const p = PROJECTS_DATA.find(x => x.name === 'City Center Complex');
  if (p) {
    p.progress = parseInt(savedProg);
    if (p.stages && p.stages[2]) {
      p.stages[2].pct = parseInt(savedProg);
      if (parseInt(savedProg) === 100) p.stages[2].status = 'done';
    }
  }
}

// ── Chart-like finance visualization (pure CSS/JS) ────────────
function renderFinanceBar(el, pct, color) {
  if (!el) return;
  el.style.width = '0%';
  el.style.background = color;
  setTimeout(() => { el.style.width = pct + '%'; el.style.transition = 'width 1.2s cubic-bezier(0.4,0,0.2,1)'; }, 200);
}

// ── Circular progress ring ────────────────────────────────────
function renderRing(svg, pct, strokeColor = '#8B5CF6') {
  if (!svg) return;
  const size   = 120;
  const radius = 48;
  const circ   = 2 * Math.PI * radius;
  const offset = circ * (1 - pct / 100);

  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.innerHTML = `
    <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="10"/>
    <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="${strokeColor}" stroke-width="10"
      stroke-linecap="round"
      stroke-dasharray="${circ}"
      stroke-dashoffset="${circ}"
      style="transition: stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1); stroke-dashoffset:${offset}"/>
  `;
}

// ── Render stage tracker ──────────────────────────────────────
function renderStages(container, stages) {
  if (!container) return;
  container.innerHTML = stages.map((s, i) => `
    <div class="stage-step ${s.status}">
      <div class="stage-dot">${s.status === 'done' ? '✓' : i + 1}</div>
      <div class="stage-name">${s.name}</div>
      <div style="font-size:0.7rem;color:var(--text-muted)">${s.pct}%</div>
    </div>
  `).join('');
}

// ── Render project card list ──────────────────────────────────
function renderProjectList() {
  const list = document.getElementById('proj-list');
  if (!list) return;
  list.innerHTML = PROJECTS_DATA.map(p => `
    <div class="proj-item" data-id="${p.id}">
      <div class="proj-item-img" style="overflow:hidden;border-radius:var(--radius-sm);">
        <img src="${p.image}" style="width:52px;height:52px;object-fit:cover;" alt="${p.name}">
      </div>
      <div class="proj-item-info">
        <div class="name">${p.name}</div>
        <div class="meta"><i class="fa-solid fa-location-dot"></i> ${p.location} &bull; <i class="fa-solid fa-helmet-safety"></i> ${p.supervisor}</div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${p.progress}%"></div>
        </div>
      </div>
      <div class="proj-item-right">
        <div class="pct">${p.progress}%</div>
        <div class="badge badge-${p.status === 'delayed' ? 'danger' : 'success'}">${p.status === 'delayed' ? '<i class="fa-solid fa-triangle-exclamation"></i> Delayed' : '✓ On Track'}</div>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.proj-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.dataset.id);
      openProjectDetail(id);
    });
  });
}

// ── Stat counters ─────────────────────────────────────────────
function renderStats() {
  const total   = PROJECTS_DATA.length;
  const delayed = PROJECTS_DATA.filter(p => p.status === 'delayed').length;
  const avgProg = Math.round(PROJECTS_DATA.reduce((s, p) => s + p.progress, 0) / (total || 1));

  setStatVal('stat-projects', total);
  setStatVal('stat-progress', avgProg + '%');
  setStatVal('stat-delays', delayed);

  // Update Main Dashboard Ring
  const mainRing = document.getElementById('main-ring');
  if (mainRing) renderRing(mainRing, avgProg);
  const mainPctEl = document.getElementById('main-ring-pct');
  if (mainPctEl) mainPctEl.textContent = avgProg + '%';
}

function setStatVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Project detail modal ──────────────────────────────────────
function openProjectDetail(id) {
  const p = PROJECTS_DATA.find(x => x.id === id);
  if (!p) return;
  const modal = document.getElementById('project-modal');
  if (!modal) return;

  document.getElementById('pm-name').textContent     = p.name;
  document.getElementById('pm-type').textContent     = p.type;
  document.getElementById('pm-location').textContent = p.location;
  document.getElementById('pm-supervisor').textContent = p.supervisor;
  document.getElementById('pm-start').textContent    = p.startDate;
  document.getElementById('pm-end').textContent      = p.endDate;
  document.getElementById('pm-pct').textContent      = p.progress + '%';
  document.getElementById('pm-status').textContent   = p.status === 'delayed' ? '<i class="fa-solid fa-triangle-exclamation"></i> Delayed' : '✓ On Track';
  document.getElementById('pm-status').className     = 'badge badge-' + (p.status === 'delayed' ? 'danger' : 'success');

  const total = p.labour + p.material + p.misc;
  document.getElementById('pm-labour').textContent   = '₹' + p.labour.toLocaleString('en-IN');
  document.getElementById('pm-material').textContent = '₹' + p.material.toLocaleString('en-IN');
  document.getElementById('pm-misc').textContent     = '₹' + p.misc.toLocaleString('en-IN');
  document.getElementById('pm-spent').textContent    = '₹' + total.toLocaleString('en-IN');
  document.getElementById('pm-budget').textContent   = '₹' + p.budget.toLocaleString('en-IN');

  const budgetPct = Math.round((total / p.budget) * 100);
  const bFill = document.getElementById('pm-budget-fill');
  if (bFill) {
    bFill.style.width = budgetPct + '%';
    bFill.style.background = budgetPct > 90 ? 'var(--danger)' : budgetPct > 75 ? 'var(--warning)' : 'var(--success)';
  }

  renderFinanceBar(document.getElementById('pm-labour-bar'),   Math.round(p.labour   / total * 100), '#8B5CF6');
  renderFinanceBar(document.getElementById('pm-material-bar'), Math.round(p.material / total * 100), '#F97316');
  renderFinanceBar(document.getElementById('pm-misc-bar'),     Math.round(p.misc     / total * 100), '#10B981');

  renderStages(document.getElementById('pm-stages'), p.stages);

  const ringSvg = document.getElementById('pm-ring');
  renderRing(ringSvg, p.progress);

  // Set Modal Cover Photo
  const pmCover = document.getElementById('pm-cover');
  if (pmCover) {
    pmCover.src = p.image || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600';
  }

  window.currentViewedProjectId = id;
  modal.classList.remove('hidden');
}

function closeProjectModal() {
  const modal = document.getElementById('project-modal');
  if (modal) modal.classList.add('hidden');
}

// ── Create project (modal) ────────────────────────────────────
function openCreateModal() {
  const m = document.getElementById('create-modal');
  if (m) m.classList.remove('hidden');
}
function closeCreateModal() {
  const m = document.getElementById('create-modal');
  if (m) m.classList.add('hidden');
}

const createForm = document.getElementById('create-project-form');
if (createForm) {
  createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(createForm);
    const supervisorName = fd.get('proj-supervisor') || 'Arjun Singh';
    const coverFile = fd.get('proj-cover');
    let imageUrl = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600';
    if (coverFile && coverFile.size > 0) {
      const coverFd = new FormData();
      coverFd.append('photos', coverFile);
      try {
        const token = sessionStorage.getItem('ck_token') || '';
        const upRes = await fetch('/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: coverFd });
        if (upRes.ok) {
          const upJson = await upRes.json();
          imageUrl = upJson.urls?.[0] || upJson.url || upJson.filePath || imageUrl;
        }
      } catch(e) {}
    }

    const newProj = {
      id: PROJECTS_DATA.length + 1,
      name:       fd.get('proj-name') || 'New Project',
      type:       fd.get('proj-type') || 'Building',
      location:   fd.get('proj-location') || 'TBD',
      supervisor: supervisorName,
      client:     fd.get('proj-client') || '',
      budget:     parseInt(fd.get('proj-budget')) || 0,
      spent: 0, labour: 0, material: 0, misc: 0,
      progress: 0,
      status: 'on-track',
      startDate: fd.get('proj-start') || '',
      endDate:   fd.get('proj-end') || '',
      stages: [
        { name: 'Planning',    pct: 0, status: 'active' },
        { name: 'Foundation',  pct: 0, status: 'pending' },
        { name: 'Structure',   pct: 0, status: 'pending' },
        { name: 'Finishing',   pct: 0, status: 'pending' },
        { name: 'Handover',    pct: 0, status: 'pending' }
      ],
      image: imageUrl
    };
    PROJECTS_DATA.push(newProj);

    // Save to API
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          name: newProj.name, type: newProj.type, location: newProj.location,
          supervisor: newProj.supervisor, client: newProj.client, budget: newProj.budget,
          startDate: newProj.startDate, endDate: newProj.endDate,
          stages: newProj.stages, image: newProj.image
        })
      });
    } catch (err) { console.warn('Could not save project to API'); }

    closeCreateModal();
    renderProjectList();
    renderStats();
    if (typeof window.renderProjectCards === 'function') window.renderProjectCards();
    if (typeof window.renderMonitoring === 'function') window.renderMonitoring();
    if (typeof window.renderFinanceTables === 'function') window.renderFinanceTables();
    showAdminToast('<i class="fa-solid fa-circle-check"></i> Project created & assigned to ' + supervisorName + '!');
    createForm.reset();
  });
}

// ── Edit & Delete Project ──────────────────────────────────────
window.promptDeleteProject = async function() {
  if (!window.currentViewedProjectId) return;
  if (!confirm("Are you sure you want to delete this project? This cannot be undone.")) return;

  const pIndex = PROJECTS_DATA.findIndex(p => p.id === window.currentViewedProjectId);
  if (pIndex === -1) return;
  const pName = PROJECTS_DATA[pIndex].name;

  try {
    const res = await fetch('/api/projects', { headers: apiHeaders() });
    if (res.ok) {
      const apiProjs = await res.json();
      const matched = apiProjs.find(ap => ap.name === pName);
      if (matched && matched._id) {
        await fetch('/api/projects/' + matched._id, { method: 'DELETE', headers: apiHeaders() });
      }
    }
  } catch(e) { console.warn('Could not delete from API'); }

  PROJECTS_DATA.splice(pIndex, 1);
  closeProjectModal();
  renderProjectList();
  renderStats();
  if (typeof window.renderProjectCards === 'function') window.renderProjectCards();
  showAdminToast('<i class="fa-solid fa-circle-check"></i> Project deleted successfully');
};

window.openEditProjectModal = async function() {
  if (!window.currentViewedProjectId) return;
  const p = PROJECTS_DATA.find(x => x.id === window.currentViewedProjectId);
  if (!p) return;

  document.getElementById('edit-proj-id').value = window.currentViewedProjectId;
  document.getElementById('edit-proj-name').value = p.name;
  document.getElementById('edit-proj-type').value = p.type || 'Building';
  document.getElementById('edit-proj-location').value = p.location;
  document.getElementById('edit-proj-start').value = p.startDate || '';
  document.getElementById('edit-proj-end').value = p.endDate || '';
  document.getElementById('edit-proj-budget').value = p.budget;

  // Set dropdowns locally
  const superSelect = document.getElementById('edit-proj-supervisor-select');
  const clientSelect = document.getElementById('edit-proj-client-select');
  
  try {
    const res = await fetch('/api/users', { headers: apiHeaders() });
    if (res.ok) {
      const users = await res.json();
      if (superSelect) superSelect.innerHTML = '<option value="Arjun Singh">Arjun Singh (default)</option>';
      if (clientSelect) clientSelect.innerHTML = '<option value="">None (Internal)</option>';
      users.forEach(u => {
        if (u.role === 'supervisor' && superSelect) {
          const opt = document.createElement('option');
          opt.value = u.name;
          opt.textContent = u.name + ' (' + (u.email || '') + ')';
          superSelect.appendChild(opt);
        } else if (u.role === 'client' && clientSelect) {
          const opt = document.createElement('option');
          opt.value = u.name;
          opt.textContent = u.name + ' (' + (u.email || '') + ')';
          clientSelect.appendChild(opt);
        }
      });
    }
  } catch (err) {}

  if (superSelect) superSelect.value = p.supervisor || '';
  if (clientSelect) clientSelect.value = p.client || '';

  closeProjectModal();
  document.getElementById('edit-modal').classList.remove('hidden');
};

window.closeEditProjectModal = function() {
  document.getElementById('edit-modal').classList.add('hidden');
};

const editForm = document.getElementById('edit-project-form');
if (editForm) {
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const curId = parseInt(document.getElementById('edit-proj-id').value);
    const p = PROJECTS_DATA.find(x => x.id === curId);
    if (!p) return;

    const fd = new FormData(editForm);
    const coverFile = fd.get('edit-proj-cover');
    let imageUrl = p.image;
    if (coverFile && coverFile.size > 0) {
      const coverFd = new FormData();
      coverFd.append('photos', coverFile);
      try {
        const upRes = await fetch('/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + getToken() }, body: coverFd });
        if (upRes.ok) {
          const upJson = await upRes.json();
          imageUrl = upJson.urls?.[0] || upJson.url || upJson.filePath || imageUrl;
        }
      } catch(e) {}
    }

    const oldName = p.name;
    p.name = fd.get('edit-proj-name');
    p.type = fd.get('edit-proj-type');
    p.location = fd.get('edit-proj-location');
    p.supervisor = fd.get('edit-proj-supervisor');
    p.client = fd.get('edit-proj-client');
    p.startDate = fd.get('edit-proj-start');
    p.endDate = fd.get('edit-proj-end');
    const bgt = parseInt(fd.get('edit-proj-budget'));
    if (!isNaN(bgt)) p.budget = bgt;
    p.image = imageUrl;

    // API Put
    try {
      const res = await fetch('/api/projects', { headers: apiHeaders() });
      if (res.ok) {
        const apiProjs = await res.json();
        const matched = apiProjs.find(ap => ap.name === oldName);
        if (matched && matched._id) {
          await fetch('/api/projects/' + matched._id, {
            method: 'PUT',
            headers: apiHeaders(),
            body: JSON.stringify({
              name: p.name, type: p.type, location: p.location, supervisor: p.supervisor, client: p.client,
              budget: p.budget, startDate: p.startDate, endDate: p.endDate, image: p.image
            })
          });
        }
      }
    } catch(err) {}

    window.closeEditProjectModal();
    renderProjectList();
    if (typeof window.renderProjectCards === 'function') window.renderProjectCards();
    showAdminToast('<i class="fa-solid fa-circle-check"></i> Project updated!');
  });
}

// ── Populate supervisor dropdown from API ─────────────────────
async function loadSupervisorsForDropdown() {
  const select = document.getElementById('proj-supervisor-select');
  const clientSelect = document.getElementById('proj-client-select');
  if (select) select.innerHTML = '<option value="Arjun Singh">Arjun Singh (default)</option>';
  if (clientSelect) clientSelect.innerHTML = '<option value="">None (Internal)</option>';

  try {
    const res = await fetch('/api/users', { headers: apiHeaders() });
    if (res.ok) {
      const users = await res.json();
      users.forEach(u => {
        if (u.role === 'supervisor' && select) {
          const opt = document.createElement('option');
          opt.value = u.name;
          opt.textContent = u.name + ' (' + (u.email || '') + ')';
          select.appendChild(opt);
        } else if (u.role === 'client' && clientSelect) {
          const opt = document.createElement('option');
          opt.value = u.name;
          opt.textContent = u.name + ' (' + (u.email || '') + ')';
          clientSelect.appendChild(opt);
        }
      });
    }
  } catch (err) { console.warn('Could not load users for dropdowns'); }
}

// ── Load registered users for admin ────────────────────────────
async function loadRegisteredUsers() {
  const wrap = document.getElementById('registered-users');
  if (!wrap) return;
  wrap.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);">Loading...</div>';
  try {
    const res = await fetch('/api/users', { headers: apiHeaders() });
    if (!res.ok) { wrap.innerHTML = '<div style="padding:16px;color:var(--text-muted);">Could not load users.</div>'; return; }
    const users = await res.json();
    if (users.length === 0) { wrap.innerHTML = '<div style="padding:16px;color:var(--text-muted);">No registered users found.</div>'; return; }
    wrap.innerHTML = `<table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Registered</th></tr></thead><tbody>
      ${users.map(u => `<tr>
        <td><strong>${u.name}</strong></td>
        <td>${u.email}</td>
        <td><span class="badge badge-${u.role === 'admin' ? 'danger' : u.role === 'supervisor' ? 'blue' : 'success'}">${u.roleLabel || u.role}</span></td>
        <td style="font-size:0.82rem;color:var(--text-muted);">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : 'N/A'}</td>
      </tr>`).join('')}
    </tbody></table>`;
  } catch (err) { wrap.innerHTML = '<div style="padding:16px;color:var(--text-muted);">Failed to load users.</div>'; }
}

// ── Admin Toast ───────────────────────────────────────────────
function showAdminToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── Sanction Plan Logic ───────────────────────────────────────
SANCTION_DOCS = [
  { id: 1, name: 'Environmental Clearance', project: 'City Center Complex', authority: 'MOEFCC', date: '2024-01-15', expiry: '2029-01-14', status: 'approved' },
  { id: 2, name: 'Building Plan Approval', project: 'City Center Complex', authority: 'Municipal Corp', date: '2024-02-10', expiry: '2027-02-09', status: 'approved' },
  { id: 3, name: 'Fire Safety NOC', project: 'City Center Complex', authority: 'Fire Department', date: '2024-03-05', expiry: '2025-03-04', status: 'expiring' },
  { id: 4, name: 'Highway Expansion NOC', project: 'NH-48 Road Expansion', authority: 'NHAI', date: '2023-05-20', expiry: '2026-05-19', status: 'approved' },
  { id: 5, name: 'Tree Felling Permit', project: 'NH-48 Road Expansion', authority: 'Forest Dept', date: '2023-06-15', expiry: '2024-06-14', status: 'approved' },
  { id: 6, name: 'Irrigation Dept Clearance', project: 'Residency Park Bridge', authority: 'Irrigation Dept', date: '', expiry: '', status: 'pending' }
];

function renderSanctionList(filter = 'all') {
  const tbody = document.getElementById('sanction-tbody');
  if (!tbody) return;
  
  const filtered = filter === 'all' ? SANCTION_DOCS : SANCTION_DOCS.filter(d => d.status === filter);
  
  tbody.innerHTML = filtered.map(d => {
    let badgeClass = d.status === 'approved' ? 'success' : d.status === 'pending' ? 'warning' : 'danger';
    let icon = d.status === 'approved' ? '<i class="fa-solid fa-circle-check"></i>' : d.status === 'pending' ? '<i class="fa-solid fa-hourglass-half"></i>' : '<i class="fa-solid fa-triangle-exclamation"></i>';
    return `
      <tr>
        <td><strong>${d.name}</strong></td>
        <td>${d.project}</td>
        <td>${d.authority || 'N/A'}</td>
        <td>${d.date || 'Pending'}</td>
        <td>${d.expiry || 'N/A'}</td>
        <td><span class="badge badge-${badgeClass}">${icon} ${d.status.charAt(0).toUpperCase() + d.status.slice(1)}</span></td>
        <td><button class="btn-primary btn-sm" style="background:var(--bg-alt);color:var(--text-dark);border:1px solid var(--border);" onclick="openSanctionModal(${d.id})">Edit</button></td>
      </tr>
    `;
  }).join('');

  if (document.getElementById('sanction-total')) {
    document.getElementById('sanction-total').textContent = SANCTION_DOCS.length;
    document.getElementById('sanction-approved').textContent = SANCTION_DOCS.filter(d=>d.status==='approved').length;
    document.getElementById('sanction-pending').textContent = SANCTION_DOCS.filter(d=>d.status==='pending').length;
    document.getElementById('sanction-expiring').textContent = SANCTION_DOCS.filter(d=>d.status==='expiring').length;
  }
}

async function loadSanctionsFromAPI() {
  try {
    const res = await fetch('/api/sanctions', { headers: apiHeaders() });
    if (res.ok) {
      const docs = await res.json();
      if (docs.length > 0) {
        SANCTION_DOCS = docs.map(d => ({
          id: d._id,
          name: d.name,
          project: d.project,
          authority: d.authority,
          date: d.date,
          expiry: d.expiry,
          status: d.status
        }));
        renderSanctionList();
      }
    }
  } catch (err) { console.warn('Could not load sanctions from API'); }
}

window.filterSanctionDocs = function() {
  const filter = document.getElementById('sanction-filter').value;
  renderSanctionList(filter);
};

window.openSanctionModal = function(id = null) {
  const m = document.getElementById('sanction-modal');
  if (m) {
    const select = document.getElementById('sanc-project');
    if (select) {
      select.innerHTML = '<option value="">Select Project</option>' + 
        PROJECTS_DATA.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    }
    const form = document.getElementById('add-sanction-form');
    if (form) {
      form.reset();
      delete form.dataset.editId;
      if (id) {
        const doc = SANCTION_DOCS.find(d => d.id === id);
        if (doc) {
          document.getElementById('sanc-name').value = doc.name;
          document.getElementById('sanc-project').value = doc.project;
          document.getElementById('sanc-authority').value = doc.authority || '';
          document.getElementById('sanc-date').value = doc.date || '';
          document.getElementById('sanc-expiry').value = doc.expiry || '';
          document.getElementById('sanc-status').value = doc.status;
          form.dataset.editId = id;
        }
      }
    }
    m.classList.remove('hidden');
  }
};
window.closeSanctionModal = function() {
  const m = document.getElementById('sanction-modal');
  if (m) m.classList.add('hidden');
};

const sanctionForm = document.getElementById('add-sanction-form');
if (sanctionForm) {
  sanctionForm.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(sanctionForm);
    const editId = sanctionForm.dataset.editId;
    
    if (editId) {
      const doc = SANCTION_DOCS.find(d => d.id == editId);
      if (doc) {
        doc.name = fd.get('sanc-name');
        doc.project = fd.get('sanc-project');
        doc.authority = fd.get('sanc-authority');
        doc.date = fd.get('sanc-date');
        doc.expiry = fd.get('sanc-expiry');
        doc.status = fd.get('sanc-status');
      }
    } else {
      SANCTION_DOCS.push({
        id: SANCTION_DOCS.length + 1,
        name: fd.get('sanc-name'),
        project: fd.get('sanc-project'),
        authority: fd.get('sanc-authority'),
        date: fd.get('sanc-date'),
        expiry: fd.get('sanc-expiry'),
        status: fd.get('sanc-status')
      });
    }
    
    closeSanctionModal();
    renderSanctionList(document.getElementById('sanction-filter').value);
    
    showAdminToast(editId ? '<i class="fa-solid fa-circle-check"></i> Document updated successfully' : '<i class="fa-solid fa-circle-check"></i> Document added to Sanction Plan');
    sanctionForm.reset();
    delete sanctionForm.dataset.editId;
  });
}

// ── MONITORING — Fetch Supervisor Data ────────────────────────
async function loadSupervisorData() {
  const token = getToken();
  if (!token) return { attendance: [], materials: [], reports: [], measurements: [] };

  const results = { attendance: [], materials: [], reports: [], measurements: [] };
  try {
    const [attRes, matRes, repRes, measRes] = await Promise.all([
      fetch('/api/attendance', { headers: apiHeaders() }),
      fetch('/api/materials', { headers: apiHeaders() }),
      fetch('/api/reports', { headers: apiHeaders() }),
      fetch('/api/measurements', { headers: apiHeaders() })
    ]);
    if (attRes.ok) results.attendance = await attRes.json();
    if (matRes.ok) results.materials = await matRes.json();
    if (repRes.ok) results.reports = await repRes.json();
    if (measRes.ok) results.measurements = await measRes.json();
  } catch (err) {
    console.warn('Could not load supervisor data:', err);
  }
  return results;
}

async function renderMonitoringData() {
  const wrap = document.getElementById('monitoring-data');
  if (!wrap) return;
  
  wrap.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">Loading supervisor data...</div>';
  const data = await loadSupervisorData();

  let html = '';

  // Attendance Records
  html += `<div class="dash-panel" style="margin-bottom:20px;">
    <div class="dash-panel-header">
      <h3><i class="fa-solid fa-helmet-safety"></i> Recent Attendance Records</h3>
      <span class="badge badge-blue">${data.attendance.length} records</span>
    </div>
    <div class="dash-panel-body" style="padding:0;">`;
  if (data.attendance.length === 0) {
    html += '<div style="padding:20px;color:var(--text-muted);text-align:center;">No attendance records submitted yet by supervisor.</div>';
  } else {
    html += `<table class="data-table"><thead><tr><th>Date</th><th>Project</th><th>Supervisor</th><th>Present</th><th>Absent</th><th>Total</th><th>Worker Details</th></tr></thead><tbody>`;
    data.attendance.slice(0, 10).forEach(a => {
      const present = a.workers ? a.workers.filter(w => w.present).length : 0;
      const total = a.workers ? a.workers.length : 0;
      const workerList = a.workers ? a.workers.map(w => `<span style="display:inline-block;padding:2px 8px;margin:2px;border-radius:10px;font-size:0.75rem;background:${w.present ? 'rgba(16,185,129,0.1);color:var(--success)' : 'rgba(239,68,68,0.1);color:var(--danger)'}">${w.name} ${w.present ? '✓' : '<i class="fa-solid fa-xmark"></i>'}</span>`).join('') : '';
      html += `<tr>
        <td>${a.date || 'N/A'}</td>
        <td>${a.project || 'N/A'}</td>
        <td>${a.submittedBy || 'N/A'}</td>
        <td><span class="badge badge-success">${present}</span></td>
        <td><span class="badge badge-danger">${total - present}</span></td>
        <td><strong>${total}</strong></td>
        <td style="max-width:300px;">${workerList}</td>
      </tr>`;
    });
    html += '</tbody></table>';
  }
  html += '</div></div>';

  // Materials Log
  html += `<div class="dash-panel" style="margin-bottom:20px;">
    <div class="dash-panel-header">
      <h3><i class="fa-solid fa-trowel-bricks"></i> Material Log (from Supervisor)</h3>
      <span class="badge badge-blue">${data.materials.length} entries</span>
    </div>
    <div class="dash-panel-body" style="padding:0;">`;
  if (data.materials.length === 0) {
    html += '<div style="padding:20px;color:var(--text-muted);text-align:center;">No materials logged by supervisor yet.</div>';
  } else {
    html += `<table class="data-table"><thead><tr><th>Material</th><th>Qty</th><th>Unit</th><th>Project</th><th>Date</th><th>Submitted By</th></tr></thead><tbody>`;
    data.materials.slice(0, 15).forEach(m => {
      html += `<tr>
        <td><strong>${m.item}</strong></td>
        <td>${m.qty}</td>
        <td>${m.unit}</td>
        <td>${m.project || 'N/A'}</td>
        <td>${m.date || 'N/A'}</td>
        <td>${m.submittedBy || 'N/A'}</td>
      </tr>`;
    });
    html += '</tbody></table>';
  }
  html += '</div></div>';

  // Daily Reports
  html += `<div class="dash-panel" style="margin-bottom:20px;">
    <div class="dash-panel-header">
      <h3><i class="fa-solid fa-file-pen"></i> Daily Reports (from Supervisor)</h3>
      <span class="badge badge-blue">${data.reports.length} reports</span>
    </div>
    <div class="dash-panel-body">`;
  if (data.reports.length === 0) {
    html += '<div style="color:var(--text-muted);text-align:center;">No daily reports submitted yet.</div>';
  } else {
    data.reports.slice(0, 5).forEach(r => {
      html += `<div style="padding:16px;background:var(--glass-bg);border:1px solid var(--border);border-radius:var(--radius-md);margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong style="color:var(--text-dark);">${r.project || 'Project'}</strong>
          <div style="display:flex;gap:8px;">
            <span class="badge badge-navy">${r.date || 'N/A'}</span>
            <span class="badge badge-blue">${r.weather || ''}</span>
            <span class="badge badge-info">${r.stage || ''}</span>
          </div>
        </div>
        <div style="font-size:0.88rem;color:var(--text-mid);margin-bottom:6px;"><strong>Work Done:</strong> ${r.workDone || r.content || 'N/A'}</div>
        ${r.issues ? `<div style="font-size:0.85rem;color:var(--warning);"><strong>Issues:</strong> ${r.issues}</div>` : ''}
        ${r.photos && r.photos.length ? `<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">${r.photos.map(p => `<img src="${p}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" alt="Site photo">`).join('')}</div>` : ''}
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:6px;">Submitted by: ${r.submittedBy || 'Supervisor'}</div>
      </div>`;
    });
  }
  html += '</div></div>';

  // Measurements
  html += `<div class="dash-panel" style="margin-bottom:20px;">
    <div class="dash-panel-header">
      <h3><i class="fa-solid fa-ruler-combined"></i> Measurement Records</h3>
      <span class="badge badge-blue">${data.measurements.length} records</span>
    </div>
    <div class="dash-panel-body" style="padding:0;">`;
  if (data.measurements.length === 0) {
    html += '<div style="padding:20px;color:var(--text-muted);text-align:center;">No measurements submitted yet.</div>';
  } else {
    html += `<table class="data-table"><thead><tr><th>Date</th><th>Project</th><th>Type</th><th>Fields</th><th>Notes</th></tr></thead><tbody>`;
    data.measurements.slice(0, 10).forEach(m => {
      const fieldsStr = m.fields ? Object.entries(m.fields).map(([k,v]) => `${k}: ${v}`).join(', ') : 'N/A';
      html += `<tr>
        <td>${m.date || 'N/A'}</td>
        <td>${m.project || 'N/A'}</td>
        <td><span class="badge badge-navy">${m.projectType || 'N/A'}</span></td>
        <td style="font-size:0.82rem;">${fieldsStr}</td>
        <td style="font-size:0.82rem;color:var(--text-muted);">${m.notes || '—'}</td>
      </tr>`;
    });
    html += '</tbody></table>';
  }
  html += '</div></div>';

  wrap.innerHTML = html;
}

// ── Finance Panel — Expenses from Reports ─────────────────────
async function renderFinancePanel() {
  const wrap = document.getElementById('finance-data');
  if (!wrap) return;
  wrap.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">Loading finance data...</div>';

  try {
    // Get project data with finance + expense aggregation
    const [projRes, expRes] = await Promise.all([
      fetch('/api/projects', { headers: apiHeaders() }),
      fetch('/api/reports', { headers: apiHeaders() })
    ]);

    let projects = PROJECTS_DATA;
    if (projRes.ok) {
      const apiProjects = await projRes.json();
      // Merge API finance data
      apiProjects.forEach(ap => {
        const match = projects.find(p => p.name === ap.name);
        if (match) {
          match.spent = ap.spent ?? match.spent;
          match.labour = ap.labour ?? match.labour;
          match.material = ap.material ?? match.material;
          match.misc = ap.misc ?? match.misc;
        }
      });
    }

    // Aggregate expenses from reports
    let recentExpenses = [];
    if (expRes.ok) {
      const reports = await expRes.json();
      recentExpenses = reports.filter(r => r.expenses && (r.expenses.labour > 0 || r.expenses.material > 0 || r.expenses.misc > 0));
    }

    let html = '';

    // Project Finance Summary
    html += '<div class="three-col-grid" style="margin-bottom:24px;">';
    projects.forEach(p => {
      const total = (p.labour || 0) + (p.material || 0) + (p.misc || 0);
      const budgetPct = p.budget > 0 ? Math.round(total / p.budget * 100) : 0;
      html += `<div class="premium-card" style="padding:20px;">
        <h4 style="font-size:1rem;margin-bottom:12px;">${p.name}</h4>
        <div style="display:flex;justify-content:space-between;font-size:0.82rem;color:var(--text-muted);margin-bottom:8px;"><span>Budget</span><strong>₹${(p.budget || 0).toLocaleString('en-IN')}</strong></div>
        <div style="display:flex;justify-content:space-between;font-size:0.82rem;color:var(--text-muted);margin-bottom:8px;"><span>Spent</span><strong style="color:${budgetPct > 90 ? 'var(--danger)' : 'var(--text-dark)'};">₹${total.toLocaleString('en-IN')}</strong></div>
        <div class="progress-bar-wrap" style="height:8px;margin-bottom:12px;"><div class="progress-bar-fill" style="width:${Math.min(budgetPct, 100)}%;background:${budgetPct > 90 ? 'var(--danger)' : budgetPct > 75 ? 'var(--warning)' : 'var(--blue)'};"></div></div>
        <div style="font-size:0.78rem;color:var(--text-muted);">${budgetPct}% of budget used</div>
        <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
          <div style="text-align:center;padding:8px;background:rgba(139,92,246,0.06);border-radius:8px;"><div style="font-size:0.72rem;color:var(--text-muted);">Labour</div><div style="font-weight:700;font-size:0.85rem;color:var(--blue);">₹${(p.labour || 0).toLocaleString('en-IN')}</div></div>
          <div style="text-align:center;padding:8px;background:rgba(249,115,22,0.06);border-radius:8px;"><div style="font-size:0.72rem;color:var(--text-muted);">Material</div><div style="font-weight:700;font-size:0.85rem;color:var(--warning);">₹${(p.material || 0).toLocaleString('en-IN')}</div></div>
          <div style="text-align:center;padding:8px;background:rgba(16,185,129,0.06);border-radius:8px;"><div style="font-size:0.72rem;color:var(--text-muted);">Misc</div><div style="font-weight:700;font-size:0.85rem;color:var(--success);">₹${(p.misc || 0).toLocaleString('en-IN')}</div></div>
        </div>
      </div>`;
    });
    html += '</div>';

    // Recent Expense Entries from Reports
    html += `<div class="dash-panel"><div class="dash-panel-header"><h3>💸 Recent Expense Reports (from Supervisor)</h3><span class="badge badge-blue">${recentExpenses.length} entries</span></div><div class="dash-panel-body" style="padding:0;">`;
    if (recentExpenses.length === 0) {
      html += '<div style="padding:20px;color:var(--text-muted);text-align:center;">No expense reports submitted yet. Supervisors can add expenses in their daily reports.</div>';
    } else {
      html += `<table class="data-table"><thead><tr><th>Date</th><th>Project</th><th>Labour</th><th>Material</th><th>Misc</th><th>Total</th><th>Description</th><th>By</th></tr></thead><tbody>`;
      recentExpenses.slice(0, 20).forEach(r => {
        const e = r.expenses;
        const total = (e.labour || 0) + (e.material || 0) + (e.misc || 0);
        html += `<tr>
          <td>${r.date || 'N/A'}</td>
          <td>${r.project || 'N/A'}</td>
          <td>₹${(e.labour || 0).toLocaleString('en-IN')}</td>
          <td>₹${(e.material || 0).toLocaleString('en-IN')}</td>
          <td>₹${(e.misc || 0).toLocaleString('en-IN')}</td>
          <td><strong>₹${total.toLocaleString('en-IN')}</strong></td>
          <td style="font-size:0.82rem;color:var(--text-muted);max-width:200px;">${e.description || '—'}</td>
          <td>${r.submittedBy || 'N/A'}</td>
        </tr>`;
      });
      html += '</tbody></table>';
    }
    html += '</div></div>';

    wrap.innerHTML = html;
  } catch (err) {
    wrap.innerHTML = '<div style="padding:20px;color:var(--text-muted);text-align:center;">Failed to load finance data.</div>';
  }
}

// ── Navigation panel switching ────────────────────────────────
function switchPanel(id) {
  document.querySelectorAll('.dash-panel-section').forEach(sec => {
    sec.classList.add('hidden');
    sec.style.display = '';
  });
  const target = document.getElementById('panel-' + id);
  if (target) {
    target.classList.remove('hidden');
    target.style.display = '';
  }
  setActiveNav(id);

  // Lazy load panels
  if (id === 'monitoring') renderMonitoringData();
  if (id === 'finance') renderFinancePanel();
  if (id === 'users') loadRegisteredUsers();
  if (id === 'attendance') renderAttendanceAdmin();
  if (id === 'alerts') {
    renderAlertsNotifications();
    loadContactMessages();
  }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const user = authGuard('admin');
  if (!user) return;
  fillSidebarUser();
  initSidebar();

  // Load live data from MongoDB API before rendering
  await loadProjectsFromAPI();
  await loadSupervisorsForDropdown();
  await loadSanctionsFromAPI();

  renderStats();
  renderProjectList();
  renderSanctionList();

  // Topbar date
  const dateEl = document.getElementById('topbar-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', year:'numeric', month:'short', day:'numeric' });

  // Main ring
  const mainRing = document.getElementById('main-ring');
  const avgProg  = Math.round(PROJECTS_DATA.reduce((s,p) => s+p.progress, 0) / PROJECTS_DATA.length);
  renderRing(mainRing, avgProg);
  const mainPctEl = document.getElementById('main-ring-pct');
  if (mainPctEl) mainPctEl.textContent = avgProg + '%';

  // Default panel
  switchPanel('overview');

  // Load notifications (supervisor photo uploads + alerts)
  renderNotifications();

  // Socket.io Real-time updates
  if (typeof io !== 'undefined') {
    const socket = io();
    socket.on('data_updated', async () => {
      // Silently refresh stats and projects without disrupting open modals
      await loadProjectsFromAPI();
      renderStats();
      renderProjectList();
      const mainRing = document.getElementById('main-ring');
      const avgProg  = Math.round(PROJECTS_DATA.reduce((s,p) => s+p.progress, 0) / (PROJECTS_DATA.length || 1));
      if (mainRing) renderRing(mainRing, avgProg);
      const mainPctEl = document.getElementById('main-ring-pct');
      if (mainPctEl) mainPctEl.textContent = avgProg + '%';
      
      const monPanel = document.getElementById('panel-monitoring');
      if (monPanel && !monPanel.classList.contains('hidden')) renderMonitoringData();
      
      const finPanel = document.getElementById('panel-finance');
      if (finPanel && !finPanel.classList.contains('hidden')) renderFinancePanel();
      
      const attPanel = document.getElementById('panel-attendance');
      if (attPanel && !attPanel.classList.contains('hidden')) renderAttendanceAdmin();
      
      const userPanel = document.getElementById('panel-users');
      if (userPanel && !userPanel.classList.contains('hidden')) loadRegisteredUsers();
      
      const alertPanel = document.getElementById('panel-alerts');
      if (alertPanel && !alertPanel.classList.contains('hidden')) renderNotifications();
    });
  }
});

window.openProjectDetail    = openProjectDetail;
window.closeProjectModal    = closeProjectModal;
window.openCreateModal      = openCreateModal;
window.closeCreateModal     = closeCreateModal;
window.switchPanel          = switchPanel;
window.renderRing           = renderRing;
window.renderStages         = renderStages;
window.renderMonitoringData = renderMonitoringData;
window.renderFinancePanel   = renderFinancePanel;
window.loadRegisteredUsers  = loadRegisteredUsers;

// ── ATTENDANCE PANEL FOR ADMIN ───────────────────────────────
async function renderAttendanceAdmin() {
  const wrap = document.getElementById('attendance-admin-table');
  if (!wrap) return;
  wrap.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">Loading attendance data...</div>';

  try {
    const res = await fetch('/api/attendance', { headers: apiHeaders() });
    if (!res.ok) { wrap.innerHTML = '<div style="padding:20px;color:var(--text-muted);text-align:center;">Could not load attendance records.</div>'; return; }
    const records = await res.json();
    
    // Populate global state for export
    ATTENDANCE_ADMIN = records.map(a => ({
      date: a.date,
      projectId: a.projectId || 0,
      supervisor: a.submittedBy || 'N/A',
      totalPresent: a.workers ? a.workers.filter(w => w.present).length : 0,
      totalAbsent: a.workers ? a.workers.filter(w => !w.present).length : 0,
      workersPresent: a.workers ? a.workers.filter(w => w.present).map(w => w.name) : [],
      workersAbsent: a.workers ? a.workers.filter(w => !w.present).map(w => w.name) : []
    }));

    // Compute stats
    let totalPresent = 0, totalAbsent = 0, uniqueWorkers = new Set();
    records.forEach(a => {
      if (a.workers) {
        a.workers.forEach(w => {
          uniqueWorkers.add(w.name);
          if (w.present) totalPresent++; else totalAbsent++;
        });
      }
    });

    const presEl = document.getElementById('att-admin-present');
    const absEl = document.getElementById('att-admin-absent');
    const recEl = document.getElementById('att-admin-records');
    const wrkEl = document.getElementById('att-admin-workers');
    if (presEl) presEl.textContent = totalPresent;
    if (absEl) absEl.textContent = totalAbsent;
    if (recEl) recEl.textContent = records.length;
    if (wrkEl) wrkEl.textContent = uniqueWorkers.size;

    if (records.length === 0) {
      wrap.innerHTML = '<div style="padding:20px;color:var(--text-muted);text-align:center;">No attendance records submitted yet by any supervisor.</div>';
      return;
    }

    let html = `<table class="data-table"><thead><tr><th>Date</th><th>Project</th><th>Supervisor</th><th>Present</th><th>Absent</th><th>Total</th><th>Workers</th></tr></thead><tbody>`;
    records.forEach(a => {
      const present = a.workers ? a.workers.filter(w => w.present).length : 0;
      const total = a.workers ? a.workers.length : 0;
      const workerList = a.workers ? a.workers.map(w => `<span style="display:inline-block;padding:2px 8px;margin:2px;border-radius:10px;font-size:0.75rem;background:${w.present ? 'rgba(16,185,129,0.1);color:var(--success)' : 'rgba(239,68,68,0.1);color:var(--danger)'}">${w.name} ${w.present ? '✓' : '<i class="fa-solid fa-xmark"></i>'}</span>`).join('') : '';
      html += `<tr>
        <td>${a.date || 'N/A'}</td>
        <td><strong>${a.project || 'N/A'}</strong></td>
        <td>${a.submittedBy || 'N/A'}</td>
        <td><span class="badge badge-success">${present}</span></td>
        <td><span class="badge badge-danger">${total - present}</span></td>
        <td><strong>${total}</strong></td>
        <td style="max-width:300px;">${workerList}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;
  } catch (err) {
    wrap.innerHTML = '<div style="padding:20px;color:var(--text-muted);text-align:center;">Failed to load attendance data.</div>';
  }
}
window.renderAttendanceAdmin = renderAttendanceAdmin;

// ── NOTIFICATIONS PANEL — Photo uploads + alerts ─────────────
async function renderNotifications() {
  const wrap = document.getElementById('notifications-panel');
  const badge = document.getElementById('notif-count-badge');
  if (!wrap) return;

  let notifications = [];

  // Static alerts
  notifications.push({
    type: 'danger',
    icon: '<i class="fa-solid fa-triangle-exclamation"></i>',
    title: 'Residency Park Bridge — Delay Detected',
    desc: 'Project is 2 months behind schedule. Current stage: Railings (80%). Expected handover: Mar 2026 → revised Jun 2026.',
    time: '3 days ago',
    photos: []
  });
  notifications.push({
    type: 'success',
    icon: '<i class="fa-solid fa-circle-check"></i>',
    title: 'City Center Complex — Foundation Stage Complete',
    desc: 'Foundation and structure stages marked complete. Brickwork now at 85% progress.',
    time: '1 week ago',
    photos: []
  });

  // Fetch supervisor reports with photos
  try {
    const res = await fetch('/api/reports', { headers: apiHeaders() });
    if (res.ok) {
      const reports = await res.json();
      reports.forEach(r => {
        if (r.photos && r.photos.length > 0) {
          notifications.push({
            type: 'photo',
            icon: '<i class="fa-solid fa-camera"></i>',
            title: `${r.submittedBy || 'Supervisor'} uploaded ${r.photos.length} photo(s) — ${r.project || 'Project'}`,
            desc: r.workDone ? ('Work done: ' + r.workDone.substring(0, 120)) : 'Site photos attached to daily report.',
            time: r.date || (r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : 'Recently'),
            photos: r.photos.slice(0, 4),
            supervisorName: r.submittedBy || 'Supervisor',
            project: r.project || 'Unknown'
          });
        }
      });
    }
  } catch (err) { console.warn('Could not fetch reports for notifications'); }

  // Fetch messages from Contact form
  try {
    const res = await fetch('/api/messages', { headers: apiHeaders() });
    if (res.ok) {
      const msgs = await res.json();
      msgs.forEach(m => {
        notifications.push({
          type: 'message',
          icon: '<i class="fa-solid fa-envelope"></i>',
          title: `New Inquiry: ${m.subject || 'Website'} from ${m.name || 'Visitor'}`,
          desc: m.content ? m.content.substring(0, 120) : 'Contact form submitted.',
          time: m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-IN') : 'Recently',
          photos: []
        });
      });
    }
  } catch (err) { console.warn('Could not fetch messages for notifications'); }

  // Sort: photos first, then alerts
  const photoNotifs = notifications.filter(n => n.type === 'photo');
  const alertNotifs = notifications.filter(n => n.type !== 'photo');
  const sorted = [...photoNotifs, ...alertNotifs];

  if (badge) badge.textContent = sorted.length + ' Total';

  let html = '';
  sorted.forEach((n, i) => {
    const bgColor = n.type === 'danger' ? 'var(--danger-bg)' : n.type === 'success' ? 'var(--success-bg)' : 'var(--blue-soft)';
    const borderBottom = i < sorted.length - 1 ? 'border-bottom:1px solid var(--border);' : '';
    html += `<div style="display:flex;align-items:flex-start;gap:16px;padding:14px 0;${borderBottom}">
      <div style="width:40px;height:40px;background:${bgColor};border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.1rem;">${n.icon}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:0.9rem;color:var(--text-dark);">${n.title}</div>
        <div style="font-size:0.82rem;color:var(--text-muted);margin-top:3px;">${n.desc}</div>
        ${n.photos && n.photos.length > 0 ? `<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">${n.photos.map(p => `<img src="${p}" style="width:52px;height:52px;object-fit:cover;border-radius:8px;border:1px solid var(--border);cursor:pointer;" alt="Site photo" onclick="window.open('${p}','_blank')">`).join('')}</div>` : ''}
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:6px;"><i class="fa-solid fa-calendar-days"></i> ${n.time}</div>
      </div>
    </div>`;
  });

  if (sorted.length === 0) {
    html = '<div style="text-align:center;padding:20px;color:var(--text-muted);">No notifications yet.</div>';
  }

  wrap.innerHTML = html;
}
window.renderNotifications = renderNotifications;

// ── ALERTS PANEL — Duplicate notifications for dedicated panel ──
async function renderAlertsNotifications() {
  const wrap = document.getElementById('alerts-notifications-panel');
  const badge = document.getElementById('notif-count-badge-2');
  if (!wrap) return;

  let notifications = [];

  // Alerts from projects
  PROJECTS_DATA.forEach(p => {
    if (p.status === 'delayed') {
      notifications.push({
        type: 'danger', icon: '<i class="fa-solid fa-triangle-exclamation"></i>', 
        title: `${p.name} — Delay Detected`,
        desc: `Project is behind schedule. Current progress: ${p.progress}%.`,
        time: 'Active alert', photos: []
      });
    }
    if (p.progress >= 100) {
      notifications.push({
        type: 'success', icon: '<i class="fa-solid fa-circle-check"></i>',
        title: `${p.name} — Project Complete`,
        desc: `All stages have been completed successfully.`,
        time: 'Recently', photos: []
      });
    }
  });

  // Supervisor reports with photos
  try {
    const res = await fetch('/api/reports', { headers: apiHeaders() });
    if (res.ok) {
      const reports = await res.json();
      reports.forEach(r => {
        if (r.photos && r.photos.length > 0) {
          notifications.push({
            type: 'photo', icon: '<i class="fa-solid fa-camera"></i>',
            title: `${r.submittedBy || 'Supervisor'} uploaded ${r.photos.length} photo(s) — ${r.project || 'Project'}`,
            desc: r.workDone ? ('Work done: ' + r.workDone.substring(0, 120)) : 'Site photos attached to daily report.',
            time: r.date || 'Recently',
            photos: r.photos.slice(0, 4)
          });
        }
      });
    }
  } catch (err) { console.warn('Could not fetch reports for alerts'); }

  if (badge) badge.textContent = notifications.length + ' Total';
  const dot = document.getElementById('notif-dot');
  if (dot) dot.style.display = notifications.length > 0 ? '' : 'none';

  if (notifications.length === 0) {
    wrap.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">No notifications yet.</div>';
    return;
  }

  let html = '';
  notifications.forEach((n, i) => {
    const bgColor = n.type === 'danger' ? 'var(--danger-bg)' : n.type === 'success' ? 'var(--success-bg)' : 'var(--blue-soft)';
    const borderBottom = i < notifications.length - 1 ? 'border-bottom:1px solid var(--border);' : '';
    html += `<div style="display:flex;align-items:flex-start;gap:16px;padding:14px 0;${borderBottom}">
      <div style="width:40px;height:40px;background:${bgColor};border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.1rem;">${n.icon}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:0.9rem;color:var(--text-dark);">${n.title}</div>
        <div style="font-size:0.82rem;color:var(--text-muted);margin-top:3px;">${n.desc}</div>
        ${n.photos && n.photos.length > 0 ? `<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">${n.photos.map(p => `<img src="${p}" style="width:52px;height:52px;object-fit:cover;border-radius:8px;border:1px solid var(--border);cursor:pointer;" alt="Site photo" onclick="window.open('${p}','_blank')">`).join('')}</div>` : ''}
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:6px;"><i class="fa-solid fa-calendar-days"></i> ${n.time}</div>
      </div>
    </div>`;
  });
  wrap.innerHTML = html;
}
window.renderAlertsNotifications = renderAlertsNotifications;

// ── CONTACT MESSAGES PANEL ───────────────────────────────────
async function loadContactMessages() {
  const wrap = document.getElementById('contact-messages-panel');
  const badge = document.getElementById('msg-count-badge');
  if (!wrap) return;
  wrap.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">Loading messages...</div>';

  try {
    const res = await fetch('/api/messages', { headers: apiHeaders() });
    if (!res.ok) { wrap.innerHTML = '<div style="padding:20px;color:var(--text-muted);text-align:center;">Could not load messages.</div>'; return; }
    const messages = await res.json();
    if (badge) badge.textContent = messages.length;

    if (messages.length === 0) {
      wrap.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);">No contact form submissions yet.</div>';
      return;
    }

    let html = '<table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Subject</th><th>Message</th><th>Date</th><th>Action</th></tr></thead><tbody>';
    messages.forEach(m => {
      const date = m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : 'N/A';
      html += `<tr>
        <td><strong>${m.name || 'N/A'}</strong></td>
        <td><a href="mailto:${m.email}" style="color:var(--blue);text-decoration:none;">${m.email || 'N/A'}</a></td>
        <td><span class="badge badge-navy">${m.subject || 'Contact'}</span></td>
        <td style="max-width:250px;font-size:0.82rem;color:var(--text-mid);">${(m.message || '').substring(0, 150)}${(m.message||'').length > 150 ? '...' : ''}</td>
        <td style="font-size:0.8rem;color:var(--text-muted);white-space:nowrap;">${date}</td>
        <td><button class="btn-primary btn-sm" style="background:rgba(239,68,68,0.1);color:var(--danger);border:1px solid rgba(239,68,68,0.2);font-size:0.75rem;padding:4px 10px;" onclick="deleteContactMessage('${m._id}')">Delete</button></td>
      </tr>`;
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;
  } catch (err) {
    wrap.innerHTML = '<div style="padding:20px;color:var(--text-muted);text-align:center;">Failed to load messages.</div>';
  }
}
window.loadContactMessages = loadContactMessages;

async function deleteContactMessage(id) {
  if (!confirm('Delete this message?')) return;
  try {
    await fetch('/api/messages/' + id, { method: 'DELETE', headers: apiHeaders() });
    loadContactMessages();
} catch (err) { console.warn('Delete message failed:', err); }
}
window.deleteContactMessage = deleteContactMessage;

// ── EXPORT TO EXCEL ──────────────────────────────────────────
async function exportDataToExcel() {
  if (typeof XLSX === 'undefined') {
    alert("Excel library is still loading. Please try again in a moment.");
    return;
  }

  // Visual feedback
  const btn = document.querySelector('button[onclick="exportDataToExcel()"]');
  const oldHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exporting...';
  btn.disabled = true;

  try {
    // Fetch latest reports, materials, and measurements for the export
    let allReports = [];
    let allMaterials = [];
    let allMeasurements = [];
    
    try {
      const [repRes, matRes, measRes] = await Promise.all([
        fetch('/api/reports', { headers: apiHeaders() }),
        fetch('/api/materials', { headers: apiHeaders() }),
        fetch('/api/measurements', { headers: apiHeaders() })
      ]);
      
      if (repRes.ok) allReports = await repRes.json();
      if (matRes.ok) allMaterials = await matRes.json();
      if (measRes.ok) allMeasurements = await measRes.json();
    } catch(e) {
      console.warn("Some data fetching failed during export:", e);
    }
    
    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // 1. Projects Sheet
    const projectsData = PROJECTS_DATA.map(p => ({
      "Project ID": p.id,
      "Project Name": p.name,
      "Type": p.type,
      "Status": p.status,
      "Location": p.location,
      "Progress (%)": p.progress,
      "Supervisor Assigned": p.supervisor,
      "Start Date": p.startDate || "N/A",
      "Estimated End Date": p.endDate || "N/A"
    }));
    const wsProjects = XLSX.utils.json_to_sheet(projectsData.length ? projectsData : [{"Note": "No active projects"}]);
    XLSX.utils.book_append_sheet(wb, wsProjects, "Projects");

    // 2. Finances
    const financesData = PROJECTS_DATA.map(p => {
      const totalSpent = (p.labour || 0) + (p.material || 0) + (p.misc || 0);
      return {
        "Project Name": p.name,
        "Total Budget (INR)": p.budget || 0,
        "Labour Cost (INR)": p.labour || 0,
        "Material Cost (INR)": p.material || 0,
        "Misc Cost (INR)": p.misc || 0,
        "Total Spent (INR)": totalSpent,
        "Utilisation (%)": p.budget > 0 ? Math.round((totalSpent / p.budget) * 100) : 0
      };
    });
    const wsFinances = XLSX.utils.json_to_sheet(financesData.length ? financesData : [{"Note": "No financial records"}]);
    XLSX.utils.book_append_sheet(wb, wsFinances, "Finances");

    // 3. Daily Site Reports (General Log)
    const reportsData = allReports.map(r => ({
      "Project Name": r.project || "N/A",
      "Report Date": r.date || "N/A",
      "Supervisor": r.submittedBy || "N/A",
      "Work Description": r.workDone || "N/A",
      "Weather": r.weather || "N/A",
      "Stage": r.stage || "N/A",
      "Labour Expense": r.expenses?.labour || 0,
      "Material Expense": r.expenses?.material || 0,
      "Misc Expense": r.expenses?.misc || 0
    }));
    const wsReports = XLSX.utils.json_to_sheet(reportsData.length ? reportsData : [{"Note": "No site reports available"}]);
    XLSX.utils.book_append_sheet(wb, wsReports, "Site Reports Log");

    // 4. Materials Log (Gramular Record)
    const materialsLogData = allMaterials.map(m => ({
      "Date": m.date || m.createdAt?.split('T')[0] || "N/A",
      "Project": m.project || "N/A",
      "Item": m.item || "N/A",
      "Quantity": m.qty || 0,
      "Unit": m.unit || "N/A",
      "Submitted By": m.submittedBy || "N/A"
    }));
    const wsMaterials = XLSX.utils.json_to_sheet(materialsLogData.length ? materialsLogData : [{"Note": "No material records available"}]);
    XLSX.utils.book_append_sheet(wb, wsMaterials, "Materials Log");

    // 5. Measurements Log (Flattened)
    const measurementsLogData = allMeasurements.map(m => {
      const row = {
        "Date": m.date || m.createdAt?.split('T')[0] || "N/A",
        "Project": m.project || "N/A",
        "Type": m.projectType || "N/A",
        "Supervisor": m.submittedBy || "N/A",
        "Notes": m.notes || ""
      };
      // Flatten dynamic fields (Length, Breadth, Depth, etc)
      if (m.fields) {
        Object.keys(m.fields).forEach(key => {
          row[key] = m.fields[key];
        });
      }
      return row;
    });
    const wsMeasurements = XLSX.utils.json_to_sheet(measurementsLogData.length ? measurementsLogData : [{"Note": "No measurement records available"}]);
    XLSX.utils.book_append_sheet(wb, wsMeasurements, "Measurements Log");

    // 6. Attendance
    const wsAttendance = XLSX.utils.json_to_sheet(ATTENDANCE_ADMIN.length ? ATTENDANCE_ADMIN : [{"Note": "No attendance records"}]);
    XLSX.utils.book_append_sheet(wb, wsAttendance, "Attendance");

    // 7. Sanctions & Approvals
    const wsSanctions = XLSX.utils.json_to_sheet(SANCTION_DOCS.length ? SANCTION_DOCS : [{"Note": "No sanction documents"}]);
    XLSX.utils.book_append_sheet(wb, wsSanctions, "Sanctions");

    // Finally download the file
    XLSX.writeFile(wb, "Core_Konstruct_Export_" + new Date().toISOString().split('T')[0] + ".xlsx");
  } catch (err) {
    console.error("Export failed:", err);
    alert("Export failed. Please check the console for details.");
  } finally {
    btn.innerHTML = oldHtml;
    btn.disabled = false;
  }
}
window.exportDataToExcel = exportDataToExcel;
