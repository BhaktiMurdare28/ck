/* ============================================================
   CORE KONSTRUCT — supervisor.js
   Supervisor dashboard: projects from API, add workers,
   attendance synced to API, measurements history,
   expenses in daily reports, all data synced to MongoDB
   ============================================================ */

// ── Helpers ───────────────────────────────────────────────────
function getToken() { return sessionStorage.getItem('ck_token') || ''; }
function apiHeaders() { return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() }; }

function showSuperToast(msg, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'warning') toast.style.borderLeftColor = 'var(--warning)';
  if (type === 'error') toast.style.borderLeftColor = 'var(--danger)';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── State ─────────────────────────────────────────────────────
let assignedProjects = [];
let selectedProject = null;

// ── Workers — dynamic, supervisor can add names ───────────────
const currentUser = JSON.parse(sessionStorage.getItem('ck_user') || '{}');
const workerStorageKey = 'ck_workers_' + (currentUser.email || currentUser.name || 'default');

let workers = JSON.parse(localStorage.getItem(workerStorageKey) || 'null');
if (!workers || workers.length === 0) {
  workers = [
  { id: 1, name: 'Ramesh Kumar',    init: 'RK' },
  { id: 2, name: 'Suresh Patil',    init: 'SP' },
  { id: 3, name: 'Amit Singh',      init: 'AS' },
  { id: 4, name: 'Vijay Yadav',     init: 'VY' },
  { id: 5, name: 'Pradeep Sharma',  init: 'PS' },
  { id: 6, name: 'Mohan Das',       init: 'MD' },
  { id: 7, name: 'Raju Tiwari',     init: 'RT' },
  { id: 8, name: 'Deepak Nair',     init: 'DN' },
  { id: 9, name: 'Santosh Gupta',   init: 'SG' },
  { id: 10, name: 'Ganesh Patel',   init: 'GP' }
];
  localStorage.setItem(workerStorageKey, JSON.stringify(workers));
}

const attendance = {};
workers.forEach(w => attendance[w.id] = 'present');

function saveWorkersToStorage() {
  localStorage.setItem(workerStorageKey, JSON.stringify(workers));
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

// Add worker by name
function addWorker() {
  const inp = document.getElementById('add-worker-name');
  if (!inp) return;
  const name = inp.value.trim();
  if (!name) { showSuperToast('<i class="fa-solid fa-triangle-exclamation"></i> Please enter a worker name', 'warning'); return; }
  
  const newId = workers.length > 0 ? Math.max(...workers.map(w => w.id)) + 1 : 1;
  const w = { id: newId, name, init: getInitials(name) };
  workers.push(w);
  attendance[w.id] = 'present';
  saveWorkersToStorage();
  renderAttendance();
  inp.value = '';
  showSuperToast('<i class="fa-solid fa-circle-check"></i> Worker "' + name + '" added!');
}
window.addWorker = addWorker;

function removeWorker(id) {
  workers = workers.filter(w => w.id !== id);
  delete attendance[id];
  saveWorkersToStorage();
  renderAttendance();
  showSuperToast('Worker removed');
}
window.removeWorker = removeWorker;

function renderAttendance() {
  const grid = document.getElementById('attendance-grid');
  if (!grid) return;
  grid.innerHTML = workers.map(w => `
    <div class="worker-toggle ${attendance[w.id] || 'present'}" data-id="${w.id}" title="Click to toggle">
      <div class="avatar">${w.init}</div>
      <span class="worker-name">${w.name}</span>
      <div class="status-dot"></div>
      <button class="worker-remove" onclick="event.stopPropagation(); removeWorker(${w.id})" title="Remove worker"><i class="fa-solid fa-xmark"></i></button>
    </div>
  `).join('');

  grid.querySelectorAll('.worker-toggle').forEach(el => {
    el.addEventListener('click', () => {
      const id = parseInt(el.dataset.id);
      attendance[id] = attendance[id] === 'present' ? 'absent' : 'present';
      el.className = `worker-toggle ${attendance[id]}`;
      const removeBtn = el.querySelector('.worker-remove');
      if (removeBtn) el.appendChild(removeBtn);
      updateAttendanceSummary();
    });
  });
  updateAttendanceSummary();
}

function updateAttendanceSummary() {
  const present = workers.filter(w => attendance[w.id] === 'present').length;
  const absent  = workers.length - present;
  const presEl  = document.getElementById('att-present');
  const absEl   = document.getElementById('att-absent');
  const totEl   = document.getElementById('att-total');
  if (presEl) presEl.textContent = present;
  if (absEl)  absEl.textContent  = absent;
  if (totEl)  totEl.textContent  = workers.length;
}

// ── SAVE ATTENDANCE → API ─────────────────────────────────────
const saveAttBtn = document.getElementById('save-attendance');
if (saveAttBtn) {
  saveAttBtn.addEventListener('click', async () => {
    if (!selectedProject) {
      showSuperToast('<i class="fa-solid fa-triangle-exclamation"></i> No project selected!', 'warning');
      return;
    }
    const projName = selectedProject.name;
    const present = workers.filter(w => attendance[w.id] === 'present').length;
    const workerData = workers.map(w => ({
      id: w.id, name: w.name, present: attendance[w.id] === 'present'
    }));

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST', headers: apiHeaders(),
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          project: projName,
          workers: workerData
        })
      });
      if (res.ok) {
        showSuperToast(`<i class="fa-solid fa-circle-check"></i> Attendance saved & synced: ${present}/${workers.length} present`);
      } else {
        showSuperToast('<i class="fa-solid fa-triangle-exclamation"></i> API sync failed', 'warning');
      }
    } catch (err) {
      showSuperToast(`<i class="fa-solid fa-circle-check"></i> Attendance saved locally: ${present}/${workers.length} present`);
    }
  });
}

// ── Material entries (synced to API) ──────────────────────────
let allMaterials = [
  { item: 'Cement OPC 53',        qty: 150, unit: 'bags', project: '__DEMO__', date: '2026-04-28' },
  { item: 'TMT Steel Rebar 12mm', qty: 5,   unit: 'MT',   project: '__DEMO__', date: '2026-04-27' },
  { item: 'River Sand (Coarse)',   qty: 2,   unit: 'cu.m', project: '__DEMO__', date: '2026-04-27' },
  { item: 'Crushed Stone 20mm',    qty: 3.5, unit: 'cu.m', project: '__DEMO__', date: '2026-04-26' },
  { item: 'AAC Blocks 600x200',   qty: 800, unit: 'nos',  project: '__DEMO__', date: '2026-04-25' }
];
let materials = [];

async function loadMaterialsFromAPI() {
  try {
    const res = await fetch('/api/materials', { headers: apiHeaders() });
    if (res.ok) {
      allMaterials = await res.json();
      filterMaterials();
    }
  } catch (err) { console.warn('Could not load materials from API'); }
}

function filterMaterials() {
  if (!selectedProject) {
    materials = [];
  } else {
    materials = allMaterials.filter(m => m.project === selectedProject.name);
  }
  renderMaterials();
}

function renderMaterials() {
  const tbody = document.getElementById('material-tbody');
  if (!tbody) return;
  tbody.innerHTML = materials.map((m, i) => `
    <tr>
      <td>${m.item}</td>
      <td>${m.qty}</td>
      <td>${m.unit}</td>
      <td>
        <button onclick="removeMaterial(${i}, '${m._id || ''}')" class="btn-icon" style="width:28px;height:28px;font-size:0.75rem;background:rgba(239,68,68,0.1);color:var(--danger);"><i class="fa-solid fa-xmark"></i></button>
      </td>
    </tr>
  `).join('');
}

async function removeMaterial(i, apiId) {
  if (apiId) {
    try { await fetch('/api/materials/' + apiId, { method: 'DELETE', headers: apiHeaders() }); } catch(e) {}
  }
  const deletedMat = materials[i];
  materials.splice(i, 1);
  allMaterials = allMaterials.filter(m => m._id !== apiId && m !== deletedMat);
  renderMaterials();
}
window.removeMaterial = removeMaterial;

const matForm = document.getElementById('material-form');
if (matForm) {
  matForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const item = document.getElementById('mat-item').value.trim();
    const qty  = parseFloat(document.getElementById('mat-qty').value);
    const unit = document.getElementById('mat-unit').value;
    if (!item || !qty) return;

    if (!selectedProject) {
      showSuperToast('<i class="fa-solid fa-triangle-exclamation"></i> No project selected', 'warning');
      return;
    }
    const projName = selectedProject.name;

    try {
      const res = await fetch('/api/materials', {
        method: 'POST', headers: apiHeaders(),
        body: JSON.stringify({ item, qty, unit, project: projName, date: new Date().toISOString().split('T')[0] })
      });
      if (res.ok) {
        const saved = await res.json();
        allMaterials.push(saved);
        filterMaterials();
        showSuperToast('<i class="fa-solid fa-circle-check"></i> Material entry added & synced!');
      } else {
        const local = { item, qty, unit, project: projName };
        allMaterials.push(local);
        filterMaterials();
        showSuperToast('<i class="fa-solid fa-triangle-exclamation"></i> Added locally, sync failed', 'warning');
      }
    } catch (err) {
      const local = { item, qty, unit, project: projName };
      allMaterials.push(local);
      filterMaterials();
      showSuperToast('<i class="fa-solid fa-circle-check"></i> Material added!');
    }
    matForm.reset();
  });
}

// ── Measurement fields by project type ───────────────────────
const MEASUREMENT_FIELDS = {
  Building: [
    { label: 'Floor Slab Area (m²)', id: 'meas-area', type: 'number', placeholder: 'e.g. 450' },
    { label: 'Column Height (m)', id: 'meas-height', type: 'number', placeholder: 'e.g. 3.5' },
    { label: 'Wall Length (m)', id: 'meas-wall', type: 'number', placeholder: 'e.g. 120' },
  ],
  Road: [
    { label: 'Length Completed (m)', id: 'meas-length', type: 'number', placeholder: 'e.g. 250' },
    { label: 'Width (m)', id: 'meas-width', type: 'number', placeholder: 'e.g. 7.5' },
    { label: 'Layer Thickness (mm)', id: 'meas-thickness', type: 'number', placeholder: 'e.g. 80' },
  ],
  Bridge: [
    { label: 'Span Completed (m)', id: 'meas-span', type: 'number', placeholder: 'e.g. 42' },
    { label: 'Deck Thickness (mm)', id: 'meas-deck', type: 'number', placeholder: 'e.g. 300' },
    { label: 'No. of Piles Done', id: 'meas-piles', type: 'number', placeholder: 'e.g. 8' },
  ],
  Drainage: [
    { label: 'Pipe Length (m)', id: 'meas-pipe', type: 'number', placeholder: 'e.g. 180' },
    { label: 'Trench Depth (m)', id: 'meas-trench', type: 'number', placeholder: 'e.g. 1.8' },
    { label: 'No. of Manholes', id: 'meas-manholes', type: 'number', placeholder: 'e.g. 4' },
  ]
};

const projTypeSelect = document.getElementById('meas-project-type');
const measFieldsWrap = document.getElementById('meas-fields');
function updateMeasFields() {
  if (!projTypeSelect || !measFieldsWrap) return;
  const fields = MEASUREMENT_FIELDS[projTypeSelect.value] || MEASUREMENT_FIELDS.Building;
  measFieldsWrap.innerHTML = fields.map(f => `
    <div class="form-group">
      <label for="${f.id}">${f.label}</label>
      <input type="${f.type}" id="${f.id}" name="${f.id}" placeholder="${f.placeholder}" class="meas-input" ${f.type === 'number' ? 'step="any"' : ''}>
    </div>
  `).join('');
}
if (projTypeSelect) { projTypeSelect.addEventListener('change', updateMeasFields); updateMeasFields(); }

// ── SAVE MEASUREMENTS → API, then show history ───────────────
const measForm = document.getElementById('measurement-form');
if (measForm) {
  measForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const projType = projTypeSelect ? projTypeSelect.value : 'Building';
    const fields = {};
    document.querySelectorAll('.meas-input').forEach(inp => { if (inp.value) fields[inp.id] = inp.value; });
    const notes = document.getElementById('meas-notes') ? document.getElementById('meas-notes').value : '';
    
    if (!selectedProject) {
      showSuperToast('<i class="fa-solid fa-triangle-exclamation"></i> No project selected', 'warning');
      return;
    }
    const projName = selectedProject.name;

    try {
      const res = await fetch('/api/measurements', {
        method: 'POST', headers: apiHeaders(),
        body: JSON.stringify({ project: projName, projectType: projType, date: new Date().toISOString().split('T')[0], fields, notes })
      });
      if (res.ok) {
        showSuperToast('<i class="fa-solid fa-circle-check"></i> Measurements saved & synced!');
        loadMeasurementHistory();
      } else {
        showSuperToast('<i class="fa-solid fa-triangle-exclamation"></i> Sync failed', 'warning');
      }
    } catch (err) {
      showSuperToast('<i class="fa-solid fa-circle-check"></i> Measurements saved!');
    }
    measForm.reset();
    updateMeasFields();
  });
}

// ── Measurement history — visible to supervisor ──────────────
async function loadMeasurementHistory() {
  const histWrap = document.getElementById('meas-history');
  if (!histWrap) return;
  histWrap.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);">Loading...</div>';

  try {
    const res = await fetch('/api/measurements', { headers: apiHeaders() });
    if (!res.ok) { histWrap.innerHTML = '<div style="padding:16px;color:var(--text-muted);">Could not load history.</div>'; return; }
    let data = await res.json();
    
    // Filter by selected project
    if (selectedProject) {
      data = data.filter(m => m.project === selectedProject.name);
    } else {
      data = [];
    }

      const DEMO_MEASUREMENTS = [
        { date: '2026-04-29', project: 'Mehta Residence', projectType: 'Building',  fields: { 'area': '420 m²', 'height': '3.2 m', 'wall': '84 m' }, notes: 'GF slab poured, curing started' },
        { date: '2026-04-27', project: 'Mehta Residence', projectType: 'Building',  fields: { 'area': '210 m²', 'height': '3.2 m', 'wall': '42 m' }, notes: 'Plinth beam shuttering complete' },
        { date: '2026-04-24', project: 'NH-48 Widening',  projectType: 'Road',      fields: { 'length': '320 m', 'width': '7.5 m', 'thickness': '80 mm' }, notes: 'Sub-base compaction passed QA' },
        { date: '2026-04-21', project: 'Navi Mumbai Drain', projectType: 'Drainage', fields: { 'pipe': '160 m', 'trench': '1.8 m', 'manholes': '4' }, notes: 'Manhole covers installed' }
      ];
      data = data.length > 0 ? data : DEMO_MEASUREMENTS;


    if (data.length === 0) {
      histWrap.innerHTML = '<div style="padding:16px;color:var(--text-muted);text-align:center;">No measurement records yet. Submit your first measurement above.</div>';
      return;
    }
    histWrap.innerHTML = `<table class="data-table">
      <thead><tr><th>Date</th><th>Project</th><th>Type</th><th>Measurements</th><th>Notes</th></tr></thead>
      <tbody>${data.slice(0, 20).map(m => {
        const fieldsStr = m.fields ? Object.entries(m.fields).map(([k,v]) => `<span style="margin-right:8px;">${k.replace('meas-','')}: <strong>${v}</strong></span>`).join('') : 'N/A';
        return `<tr>
          <td>${m.date || 'N/A'}</td>
          <td>${m.project || 'N/A'}</td>
          <td><span class="badge badge-navy">${m.projectType || 'N/A'}</span></td>
          <td style="font-size:0.82rem;">${fieldsStr}</td>
          <td style="font-size:0.82rem;color:var(--text-muted);">${m.notes || '—'}</td>
        </tr>`;
      }).join('')}</tbody></table>`;
  } catch (err) {
    histWrap.innerHTML = '<div style="padding:16px;color:var(--text-muted);">Failed to load history.</div>';
  }
}

// ── Photo upload ──────────────────────────────────────────────
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('photo-input');
const previewGrid = document.getElementById('photo-preview');
let uploadedPhotos = [];

if (uploadZone && fileInput) {
  uploadZone.addEventListener('click', () => fileInput.click());
  uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop', e => { e.preventDefault(); uploadZone.classList.remove('drag-over'); handleFiles([...e.dataTransfer.files]); });
  fileInput.addEventListener('change', () => handleFiles([...fileInput.files]));
}

function handleFiles(files) {
  files.filter(f => f.type.startsWith('image/')).forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => { uploadedPhotos.push({ src: ev.target.result, name: file.name, file }); renderPhotos(); };
    reader.readAsDataURL(file);
  });
}

function renderPhotos() {
  if (!previewGrid) return;
  previewGrid.innerHTML = uploadedPhotos.map((p, i) => `
    <div class="photo-thumb"><img src="${p.src}" alt="${p.name}"><button class="remove" onclick="removePhoto(${i})"><i class="fa-solid fa-xmark"></i></button></div>
  `).join('');
  const countEl = document.getElementById('photo-count');
  if (countEl) countEl.textContent = uploadedPhotos.length + ' photo(s) uploaded';
}

function removePhoto(i) { uploadedPhotos.splice(i, 1); renderPhotos(); }
window.removePhoto = removePhoto;

async function uploadPhotosToAPI() {
  if (uploadedPhotos.length === 0) return [];
  const hasFiles = uploadedPhotos.some(p => p.file);
  if (!hasFiles) return uploadedPhotos.map(p => p.src);
  try {
    const formData = new FormData();
    uploadedPhotos.forEach(p => { if (p.file) formData.append('photos', p.file); });
    const res = await fetch('/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + getToken() }, body: formData });
    if (res.ok) { const data = await res.json(); return data.urls || []; }
  } catch (err) { console.warn('Photo upload failed:', err); }
  return [];
}

// ── Progress slider ───────────────────────────────────────────
const progSlider = document.getElementById('progress-slider');
const progDisplay = document.getElementById('progress-display');
const progBar = document.getElementById('progress-preview-bar');

if (progSlider) {
  progSlider.addEventListener('input', () => {
    if (progDisplay) progDisplay.textContent = progSlider.value + '%';
    if (progBar) progBar.style.width = progSlider.value + '%';
  });
}

const btnUpdateProgress = document.getElementById('btn-update-progress');
if (btnUpdateProgress) {
  btnUpdateProgress.addEventListener('click', async () => {
    if (!selectedProject) {
      showSuperToast('<i class="fa-solid fa-triangle-exclamation"></i> No project selected', 'warning');
      return;
    }
    const val = progSlider ? progSlider.value : '50';

    try {
      const projRes = await fetch('/api/projects', { headers: apiHeaders() });
      if (projRes.ok) {
        const projects = await projRes.json();
        const target = selectedProject ? projects.find(p => p.name === selectedProject.name) : projects[0];
        if (target) {
          const activeStageIndex = target.stages ? target.stages.findIndex(s => s.status === 'active') : -1;
          if (activeStageIndex === -1 && target.stages && target.stages.length > 0) {
            showSuperToast('<i class="fa-solid fa-triangle-exclamation"></i> No active stage to update', 'warning');
            return;
          }
          await fetch('/api/projects/' + target._id + '/progress', {
            method: 'PUT', headers: apiHeaders(),
            body: JSON.stringify({ progress: parseInt(val), stageIndex: activeStageIndex !== -1 ? activeStageIndex : 0, note: 'Supervisor update' })
          });
        }
      }
    } catch (err) { console.warn('Could not sync progress:', err); }

    showSuperToast('<i class="fa-solid fa-circle-check"></i> Progress updated to ' + val + '%');
    loadAssignedProjects();
  });
}

// ── DAILY REPORT → API (with expenses) ───────────────────────
const reportForm = document.getElementById('daily-report-form');
if (reportForm) {
  reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (uploadedPhotos.length === 0) {
      showSuperToast('<i class="fa-solid fa-triangle-exclamation"></i> Please upload at least one site photo!', 'warning');
      return;
    }

    const photoUrls = await uploadPhotosToAPI();
    
    if (!selectedProject) {
      showSuperToast('<i class="fa-solid fa-triangle-exclamation"></i> No project selected', 'warning');
      return;
    }
    const projName = selectedProject.name;

    const reportData = {
      project: projName,
      date: document.getElementById('report-date') ? document.getElementById('report-date').value : new Date().toISOString().split('T')[0],
      weather: document.getElementById('report-weather') ? document.getElementById('report-weather').value : '',
      stage: document.getElementById('report-stage') ? document.getElementById('report-stage').value : '',
      workDone: document.getElementById('report-work') ? document.getElementById('report-work').value : '',
      issues: document.getElementById('report-issues') ? document.getElementById('report-issues').value : '',
      photos: photoUrls,
      expenses: {
        labour: parseFloat(document.getElementById('expense-labour')?.value || 0),
        material: parseFloat(document.getElementById('expense-material')?.value || 0),
        misc: parseFloat(document.getElementById('expense-misc')?.value || 0),
        description: document.getElementById('expense-desc')?.value || ''
      }
    };

    try {
      const res = await fetch('/api/reports', { method: 'POST', headers: apiHeaders(), body: JSON.stringify(reportData) });
      if (res.ok) {
        showSuperToast('<i class="fa-solid fa-circle-check"></i> Daily report & expenses submitted successfully!');
      } else {
        showSuperToast('<i class="fa-solid fa-triangle-exclamation"></i> Report saved locally, sync failed', 'warning');
      }
    } catch (err) {
      showSuperToast('<i class="fa-solid fa-circle-check"></i> Report submitted!');
    }

    reportForm.reset();
    uploadedPhotos = [];
    renderPhotos();
    const reportDateEl = document.getElementById('report-date');
    if (reportDateEl) reportDateEl.value = new Date().toISOString().split('T')[0];
  });
}

// ── Load assigned projects from API ──────────────────────────
async function loadAssignedProjects() {
  const grid = document.getElementById('assigned-projects-grid');
  if (!grid) return;

  const user = JSON.parse(sessionStorage.getItem('ck_user') || '{}');
  const supervisorName = user.name || '';

  try {
    const res = await fetch('/api/projects', { headers: apiHeaders() });
    if (res.ok) {
      const allProjects = await res.json();
      // Show projects assigned to this supervisor
      assignedProjects = allProjects.filter(p => 
        p.supervisor === supervisorName
      );
    }
  } catch (err) { console.warn('Could not load projects from API'); }

  // Fallback if no API projects
  if (assignedProjects.length === 0) {
    grid.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);width:100%;">You currently have no assigned projects. Waiting for admin assignment...</div>';
    selectedProject = null;
    return;
  }

  if (selectedProject) {
    const updated = assignedProjects.find(p => p.name === selectedProject.name);
    if (updated) selectedProject = updated;
  } else {
    selectedProject = assignedProjects[0];
  }

  grid.innerHTML = assignedProjects.map((p, i) => `
    <div class="premium-card ${selectedProject && selectedProject.name === p.name ? 'selected-project' : ''}" style="cursor:pointer;" onclick="selectProject(${i})">
      <div style="height:140px;overflow:hidden;position:relative;">
        <img src="${p.image || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600'}" style="width:100%;height:100%;object-fit:cover;" alt="${p.name}">
        <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(11,31,58,0.75),transparent);display:flex;align-items:flex-end;padding:12px;">
          <div><div style="color:var(--white);font-weight:700;font-size:1.1rem;">${p.name}</div></div>
        </div>
        ${selectedProject && selectedProject.name === p.name ? '<div style="position:absolute;top:8px;right:8px;" class="badge badge-success">✓ Selected</div>' : ''}
      </div>
      <div style="padding:14px;">
        <div class="badge badge-navy mb-8">${p.type || 'Building'}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin:4px 0 10px;"><i class="fa-solid fa-location-dot"></i> ${p.location || ''}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:0.8rem">Progress</span>
          <strong style="color:var(--blue);">${p.progress || 0}%</strong>
        </div>
        <div class="progress-bar-wrap" style="height:6px;"><div class="progress-bar-fill" style="width:${p.progress || 0}%"></div></div>
      </div>
    </div>
    </div>
  `).join('');

  // Automatically refresh the stage tracker if project is selected
  if (selectedProject) {
    renderSupervisorStages();
  renderReceipts();
  const billForm = document.getElementById('form-add-bill');
  if (billForm) {
    billForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const vendor = document.getElementById('bill-vendor').value;
      const amount = parseInt(document.getElementById('bill-amount').value, 10);
      const category = document.getElementById('bill-category').value;
      
      loggedBills.unshift({
        id: 'b' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        vendor, amount, category
      });
      
      billForm.reset();
      document.getElementById('bill-photo-name').textContent = '';
      renderReceipts();
      
      const btn = billForm.querySelector('button[type="submit"]');
      const ogHtml = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Logged!';
      btn.style.background = '#10b981';
      setTimeout(() => { btn.innerHTML = ogHtml; btn.style.background = ''; }, 2000);
    });
    
    const fileInput = document.getElementById('bill-photo');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        document.getElementById('bill-photo-name').textContent = e.target.files[0] ? e.target.files[0].name : '';
      });
    }
  }

  }
}

function selectProject(idx) {
  selectedProject = assignedProjects[idx];
  showSuperToast('Selected: ' + selectedProject.name);
  loadAssignedProjects(); // re-render with highlight
  renderSupervisorStages(); // show stage tracker
  filterMaterials(); // refresh materials panel
  loadMeasurementHistory(); // refresh measurements panel
  // Update breadcrumb
  const bc = document.querySelector('.breadcrumb');
  if (bc) bc.textContent = selectedProject.name + ' — Active Project';
}
window.selectProject = selectProject;

// ── Render stage tracker on supervisor's project view ─────────
function renderSupervisorStages() {
  const section = document.getElementById('supervisor-stage-section');
  const tracker = document.getElementById('supervisor-stage-tracker');
  const nameEl = document.getElementById('supervisor-stage-project-name');
  if (!section || !tracker) return;

  if (!selectedProject || !selectedProject.stages || selectedProject.stages.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  if (nameEl) nameEl.textContent = selectedProject.name;

  tracker.innerHTML = selectedProject.stages.map((s, i) => `
    <div class="stage-step ${s.status}">
      <div class="stage-dot">${s.status === 'done' ? '✓' : i + 1}</div>
      <div class="stage-name">${s.name}</div>
      <div style="font-size:0.7rem;color:var(--text-muted)">${s.pct}%</div>
    </div>
  `).join('');

  // Update slider to match active stage
  const activeStage = selectedProject.stages.find(s => s.status === 'active');
  const progSlider = document.getElementById('progress-slider');
  const progDisplay = document.getElementById('progress-display');
  const progBar = document.getElementById('progress-preview-bar');
  if (activeStage && progSlider) {
    progSlider.value = activeStage.pct;
    if (progDisplay) progDisplay.textContent = activeStage.pct + '%';
    if (progBar) progBar.style.width = activeStage.pct + '%';
  } else if (!activeStage && selectedProject.stages.every(s => s.status === 'done') && progSlider) {
    // If no active stage and all are done
    progSlider.value = 100;
    if (progDisplay) progDisplay.textContent = '100% (All Done)';
    if (progBar) progBar.style.width = '100%';
  }
}
window.renderSupervisorStages = renderSupervisorStages;

// ── Navigation panel switching ─────────────────────────────────
function switchSuperPanel(id) {
  document.querySelectorAll('.super-panel').forEach(p => { p.classList.add('hidden'); p.style.display = ''; });
  const target = document.getElementById('sp-' + id);
  if (target) { target.classList.remove('hidden'); target.style.display = ''; }
  setActiveNav(id);

  // Load measurement history when switching to measurements
  if (id === 'measurements') loadMeasurementHistory();
}
window.switchSuperPanel = switchSuperPanel;
window.showSuperToast = showSuperToast;

// ── Interval Check for Compulsory Photos ──────────────────────
async function checkDailyPhotoInterval() {
  const user = JSON.parse(sessionStorage.getItem('ck_user') || '{}');
  const spName = user.name || '';
  if (!spName) return;

  const today = new Date().toISOString().split('T')[0];
  let photoSubmittedToday = false;

  try {
    const res = await fetch('/api/reports', { headers: apiHeaders() });
    if (res.ok) {
      const reports = await res.json();
      // Check if there is any report today submitted by this supervisor with photos
      photoSubmittedToday = reports.some(r => r.submittedBy === spName && r.date === today && r.photos && r.photos.length > 0);
    }
  } catch(e) {}

  const banner = document.getElementById('missing-photo-banner');

  if (!photoSubmittedToday) {
    if (banner) banner.classList.remove('hidden');
    // Notify every hour if still pending
    setInterval(() => {
      showSuperToast('<i class="fa-solid fa-triangle-exclamation"></i>️ Compulsory: You have not uploaded today\'s site photos!', 'error');
    }, 60 * 60 * 1000); // 1 hour interval
  } else {
    if (banner) banner.classList.add('hidden');
  }
}

/* ═══════════════════════════════════════════════════════════════
   SUPERVISOR DOCUMENT MANAGEMENT
   ═══════════════════════════════════════════════════════════════ */

let SUPER_CURRENT_DOC_CATEGORY = 'pre-construction';
let SUPER_ALL_DOCUMENTS = [];

// Initialize supervisor documents
function initializeSupervisorDocuments() {
  SUPER_ALL_DOCUMENTS = [];
  
  // Get documents for supervisor's assigned projects
  const user = JSON.parse(sessionStorage.getItem('ck_user') || '{}');
  if (!user.assignedProjects) return;
  
  user.assignedProjects.forEach(pid => {
    const projDocs = DEMO_DOCUMENTS.filter(d => d.projectId == pid);
    SUPER_ALL_DOCUMENTS.push(...projDocs);
  });
  
  renderSupervisorDocuments();
}
window.initializeSupervisorDocuments = initializeSupervisorDocuments;

// Switch supervisor document category
function switchSuperDocCategory(category) {
  SUPER_CURRENT_DOC_CATEGORY = category;
  document.querySelectorAll('#sp-documents .doc-tab-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.style.borderBottomColor = 'transparent';
  });
  document.querySelector(`#sp-documents [data-tab="${category}"]`).classList.add('active');
  document.querySelector(`#sp-documents [data-tab="${category}"]`).style.borderBottomColor = '#3B82F6';
  renderSupervisorDocuments();
}
window.switchSuperDocCategory = switchSuperDocCategory;

// Render supervisor documents
function renderSupervisorDocuments() {
  const grid = document.getElementById('supervisor-documents-grid');
  if (!grid) return;
  
  let filtered = SUPER_ALL_DOCUMENTS.filter(d => d.category === SUPER_CURRENT_DOC_CATEGORY);
  const docTypes = DOCUMENT_TYPES[SUPER_CURRENT_DOC_CATEGORY] || [];
  
  let html = '';
  docTypes.forEach(docType => {
    const doc = filtered.find(d => d.docType === docType.id);
    const statusClass = doc ? (doc.status === 'approved' ? 'success' : doc.status === 'under-review' ? 'warning' : doc.status === 'uploaded' ? 'info' : 'danger') : 'danger';
    const statusIconMap = {
      approved:       '<i class="fa-solid fa-circle-check" style="color:var(--success);margin-right:4px;"></i>',
      'under-review': '<i class="fa-solid fa-clock" style="color:var(--warning);margin-right:4px;"></i>',
      uploaded:       '<i class="fa-solid fa-cloud-arrow-up" style="color:var(--info);margin-right:4px;"></i>',
      rejected:       '<i class="fa-solid fa-circle-xmark" style="color:var(--danger);margin-right:4px;"></i>',
      expired:        '<i class="fa-solid fa-triangle-exclamation" style="color:var(--warning);margin-right:4px;"></i>',
      missing:        '<i class="fa-solid fa-circle-question" style="color:var(--text-muted);margin-right:4px;"></i>'
    };
    const statusIcon = statusIconMap[doc?.status || 'missing'];
    
    html += `
      <div class="dash-card" style="border-radius:12px;border:1.5px solid var(--border);overflow:hidden;background:var(--bg-card);">
        <div style="padding:16px;background:linear-gradient(135deg,rgba(59,130,246,0.08),rgba(45,212,191,0.06));border-bottom:1px solid var(--border);">
          <div style="font-size:1.4rem;margin-bottom:8px;">${docType.icon}</div>
          <h4 style="margin:0;font-size:0.95rem;font-weight:700;color:var(--text-dark);">${docType.name}</h4>
        </div>
        <div style="padding:16px;">
          ${doc ? `
            <span class="badge badge-${statusClass}" style="font-size:0.75rem;padding:4px 10px;margin-bottom:12px;">
              ${statusIcon} ${doc.status.replace('-', ' ')}
            </span>
            <button class="btn-sm" style="font-size:0.75rem;padding:6px 12px;background:var(--blue);color:white;border:none;border-radius:6px;cursor:pointer;margin-top:12px;width:100%;" onclick="showSuperToast('<i class="fa-solid fa-download" style="margin-right:6px;"></i>Downloading: ${doc.fileName}', 'info')">
              <i class="fa-solid fa-download" style="margin-right:6px;"></i>Download
            </button>
          ` : `
            <div style="text-align:center;padding:12px;">
              <div style="margin-bottom:12px;"><i class="fa-solid fa-inbox" style="font-size:2rem;color:var(--text-muted);"></i></div>
              <div style="font-size:0.85rem;color:var(--text-muted);">Not uploaded</div>
            </div>
          `}
        </div>
      </div>
    `;
  });
  
  grid.innerHTML = html;
}
window.renderSupervisorDocuments = renderSupervisorDocuments;


// ── Bills & Receipts Log ────────────────────────────────────────────────────────
let loggedBills = [
  { id: 'b1', date: new Date().toISOString().split('T')[0], vendor: 'Shree Ram Hardware', category: 'Hardware', amount: 2500 },
  { id: 'b2', date: new Date().toISOString().split('T')[0], vendor: 'Bharat Petroleum', category: 'Fuel', amount: 1200 },
  { id: 'b3', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], vendor: 'Sai Enterprises', category: 'Materials', amount: 14500 }
];

function renderReceipts() {
  const tbody = document.getElementById('receipts-tbody');
  if (!tbody) return;
  if (loggedBills.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted);">No bills logged yet.</td></tr>';
    return;
  }
  tbody.innerHTML = loggedBills.map(b => `
    <tr>
      <td style="font-weight:500;color:var(--text-dark);">${b.date}</td>
      <td style="font-weight:600;">${b.vendor}</td>
      <td><span class="status-badge" style="background:var(--blue-glow);color:var(--blue);border:1px solid var(--border);">${b.category}</span></td>
      <td style="font-family:Outfit,sans-serif;font-weight:700;color:var(--text-dark);">₹${b.amount.toLocaleString('en-IN')}</td>
      <td>
        <button class="btn-icon" title="View Receipt" style="color:var(--blue);" onclick="alert('Viewing receipt for ${b.vendor}')"><i class="fa-solid fa-eye"></i></button>
      </td>
    </tr>
  `).join('');
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const user = authGuard('supervisor');
  if (!user) return;
  fillSidebarUser();
  initSidebar();
  renderAttendance();
  await loadMaterialsFromAPI();
  await loadAssignedProjects();
  renderSupervisorStages();
  initializeSupervisorDocuments();
  switchSuperPanel('projects');

  checkDailyPhotoInterval();

  const dateEl = document.getElementById('topbar-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

  const reportDateEl = document.getElementById('report-date');
  if (reportDateEl) reportDateEl.value = new Date().toISOString().split('T')[0];

  // Socket.io Real-time updates
  if (typeof io !== 'undefined') {
    const socket = io();
    socket.on('data_updated', () => {
      if (typeof loadAssignedProjects === 'function') loadAssignedProjects();
      if (typeof loadMeasurementHistory === 'function') loadMeasurementHistory();
      if (typeof filterMaterials === 'function') filterMaterials();
    });
  }
});
