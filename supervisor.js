s2a/* ============================================================
   CORE KONSTRUCT — supervisor.js
   Supervisor dashboard: attendance, materials, measurements,
   photo upload, daily report, progress slider
   ============================================================ */

// ── Workers list ──────────────────────────────────────────────
const WORKERS = [
  { id: 1, name: 'Ramesh K.',  init: 'RK' },
  { id: 2, name: 'Suresh P.',  init: 'SP' },
  { id: 3, name: 'Mahesh B.',  init: 'MB' },
  { id: 4, name: 'Pradeep N.', init: 'PN' },
  { id: 5, name: 'Vijay S.',   init: 'VS' },
  { id: 6, name: 'Anand T.',   init: 'AT' },
  { id: 7, name: 'Ganesh L.',  init: 'GL' },
  { id: 8, name: 'Dinesh R.',  init: 'DR' },
  { id: 9, name: 'Mohan C.',   init: 'MC' },
  {id: 10, name: 'Lokesh M.',  init: 'LM' }
];

// Attendance state
const attendance = {};
WORKERS.forEach(w => attendance[w.id] = 'present');

// Render attendance grid
function renderAttendance() {
  const grid = document.getElementById('attendance-grid');
  if (!grid) return;
  grid.innerHTML = WORKERS.map(w => `
    <div class="worker-toggle ${attendance[w.id]}" data-id="${w.id}" title="Click to toggle">
      <div class="avatar">${w.init}</div>
      <span class="worker-name">${w.name}</span>
      <div class="status-dot"></div>
    </div>
  `).join('');

  grid.querySelectorAll('.worker-toggle').forEach(el => {
    el.addEventListener('click', () => {
      const id = parseInt(el.dataset.id);
      attendance[id] = attendance[id] === 'present' ? 'absent' : 'present';
      el.className = `worker-toggle ${attendance[id]}`;
      updateAttendanceSummary();
    });
  });
  updateAttendanceSummary();
}

function updateAttendanceSummary() {
  const present = Object.values(attendance).filter(v => v === 'present').length;
  const absent  = WORKERS.length - present;
  const presEl  = document.getElementById('att-present');
  const absEl   = document.getElementById('att-absent');
  const totEl   = document.getElementById('att-total');
  if (presEl) presEl.textContent = present;
  if (absEl)  absEl.textContent  = absent;
  if (totEl)  totEl.textContent  = WORKERS.length;
}

// ── Material entries ──────────────────────────────────────────
let materials = [
  { item: 'Cement (OPC 53)',  qty: 120, unit: 'bags' },
  { item: 'Sand (River)',     qty: 8,   unit: 'cu.m' },
  { item: 'Steel (TMT 12mm)', qty: 2.5, unit: 'MT' }
];

function renderMaterials() {
  const tbody = document.getElementById('material-tbody');
  if (!tbody) return;
  tbody.innerHTML = materials.map((m, i) => `
    <tr>
      <td>${m.item}</td>
      <td>${m.qty}</td>
      <td>${m.unit}</td>
      <td>
        <button onclick="removeMaterial(${i})" class="btn-icon" style="width:28px;height:28px;font-size:0.75rem;background:rgba(239,68,68,0.1);color:var(--danger);">✕</button>
      </td>
    </tr>
  `).join('');
}

function removeMaterial(i) {
  materials.splice(i, 1);
  renderMaterials();
}
window.removeMaterial = removeMaterial;

const matForm = document.getElementById('material-form');
if (matForm) {
  matForm.addEventListener('submit', e => {
    e.preventDefault();
    const item = document.getElementById('mat-item').value.trim();
    const qty  = parseFloat(document.getElementById('mat-qty').value);
    const unit = document.getElementById('mat-unit').value;
    if (!item || !qty) return;
    materials.push({ item, qty, unit });
    renderMaterials();
    matForm.reset();
    showSuperToast('✅ Material entry added!');
  });
}

// ── Measurement fields by project type ───────────────────────
const MEASUREMENT_FIELDS = {
  Building: [
    { label: 'Floor Slab Area (m²)',    id: 'meas-area',     type: 'number', placeholder: 'e.g. 450' },
    { label: 'Column Height (m)',        id: 'meas-height',   type: 'number', placeholder: 'e.g. 3.5' },
    { label: 'Wall Length (m)',          id: 'meas-wall',     type: 'number', placeholder: 'e.g. 120' },
  ],
  Road: [
    { label: 'Length Completed (m)',    id: 'meas-length',   type: 'number', placeholder: 'e.g. 250' },
    { label: 'Width (m)',               id: 'meas-width',    type: 'number', placeholder: 'e.g. 7.5' },
    { label: 'Layer Thickness (mm)',    id: 'meas-thickness',type: 'number', placeholder: 'e.g. 80' },
  ],
  Bridge: [
    { label: 'Span Completed (m)',      id: 'meas-span',     type: 'number', placeholder: 'e.g. 42' },
    { label: 'Deck Thickness (mm)',     id: 'meas-deck',     type: 'number', placeholder: 'e.g. 300' },
    { label: 'No. of Piles Done',       id: 'meas-piles',    type: 'number', placeholder: 'e.g. 8' },
  ],
  Drainage: [
    { label: 'Pipe Length (m)',         id: 'meas-pipe',     type: 'number', placeholder: 'e.g. 180' },
    { label: 'Trench Depth (m)',        id: 'meas-trench',   type: 'number', placeholder: 'e.g. 1.8' },
    { label: 'No. of Manholes',         id: 'meas-manholes', type: 'number', placeholder: 'e.g. 4' },
  ]
};

const projTypeSelect = document.getElementById('meas-project-type');
const measFieldsWrap = document.getElementById('meas-fields');
function updateMeasFields() {
  if (!projTypeSelect || !measFieldsWrap) return;
  const type   = projTypeSelect.value;
  const fields = MEASUREMENT_FIELDS[type] || MEASUREMENT_FIELDS.Building;
  measFieldsWrap.innerHTML = fields.map(f => `
    <div class="form-group">
      <label for="${f.id}">${f.label}</label>
      <input type="${f.type}" id="${f.id}" name="${f.id}" placeholder="${f.placeholder}" class="meas-input">
    </div>
  `).join('');
}
if (projTypeSelect) {
  projTypeSelect.addEventListener('change', updateMeasFields);
  updateMeasFields();
}

const measForm = document.getElementById('measurement-form');
if (measForm) {
  measForm.addEventListener('submit', e => {
    e.preventDefault();
    showSuperToast('✅ Measurements saved successfully!');
    measForm.reset();
    updateMeasFields();
  });
}

// ── Photo upload ──────────────────────────────────────────────
const uploadZone  = document.getElementById('upload-zone');
const fileInput   = document.getElementById('photo-input');
const previewGrid = document.getElementById('photo-preview');
let uploadedPhotos = [];

if (uploadZone && fileInput) {
  uploadZone.addEventListener('click', () => fileInput.click());
  uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    handleFiles([...e.dataTransfer.files]);
  });
  fileInput.addEventListener('change', () => handleFiles([...fileInput.files]));
}

function handleFiles(files) {
  files.filter(f => f.type.startsWith('image/')).forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      uploadedPhotos.push({ src: ev.target.result, name: file.name });
      renderPhotos();
    };
    reader.readAsDataURL(file);
  });
}

function renderPhotos() {
  if (!previewGrid) return;
  previewGrid.innerHTML = uploadedPhotos.map((p, i) => `
    <div class="photo-thumb">
      <img src="${p.src}" alt="${p.name}">
      <button class="remove" onclick="removePhoto(${i})">✕</button>
    </div>
  `).join('');
  const countEl = document.getElementById('photo-count');
  if (countEl) countEl.textContent = uploadedPhotos.length + ' photo(s) uploaded';
}

function removePhoto(i) {
  uploadedPhotos.splice(i, 1);
  renderPhotos();
}
window.removePhoto = removePhoto;

// ── Progress slider ───────────────────────────────────────────
const progSlider  = document.getElementById('progress-slider');
const progDisplay = document.getElementById('progress-display');
const progBar     = document.getElementById('progress-preview-bar');

const savedCityProg = localStorage.getItem('ck_city_complex_prog');
if (savedCityProg && progSlider) {
  progSlider.value = savedCityProg;
  if (progDisplay) progDisplay.textContent = savedCityProg + '%';
  if (progBar) progBar.style.width = savedCityProg + '%';
}

if (progSlider) {
  progSlider.addEventListener('input', () => {
    const val = progSlider.value;
    if (progDisplay) progDisplay.textContent = val + '%';
    if (progBar) progBar.style.width = val + '%';
  });
}

const btnUpdateProgress = document.getElementById('btn-update-progress');
if (btnUpdateProgress) {
  btnUpdateProgress.addEventListener('click', () => {
    const val = progSlider ? progSlider.value : '85';
    localStorage.setItem('ck_city_complex_prog', val);
    showSuperToast('✅ Progress updated to ' + val + '%');
    renderAssignedProjects();
  });
}

// ── Daily report form ─────────────────────────────────────────
const reportForm = document.getElementById('daily-report-form');
if (reportForm) {
  reportForm.addEventListener('submit', e => {
    e.preventDefault();
    if (uploadedPhotos.length === 0) {
      showSuperToast('⚠ Please upload at least one site photo before submitting!', 'warning');
      return;
    }
    showSuperToast('✅ Daily report submitted successfully!');
    reportForm.reset();
  });
}

// ── Save attendance ────────────────────────────────────────────
const saveAttBtn = document.getElementById('save-attendance');
if (saveAttBtn) {
  saveAttBtn.addEventListener('click', () => {
    const present = Object.values(attendance).filter(v => v === 'present').length;
    showSuperToast(`✅ Attendance saved: ${present}/${WORKERS.length} present`);
  });
}

// ── Render Assigned Projects ──────────────────────────────────
function renderAssignedProjects() {
  const grid = document.getElementById('assigned-projects-grid');
  if (!grid) return;
  
  let projects = [
    {
      id: 1,
      name: 'City Center Complex',
      type: 'Building',
      location: 'Mumbai, MH',
      progress: parseInt(localStorage.getItem('ck_city_complex_prog') || '68'),
      status: 'on-track',
      image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?q=80&w=600'
    }
  ];
  
  const saved = JSON.parse(localStorage.getItem('supervisor_projects_v2') || '[]');
  projects = [...projects, ...saved];
  
  grid.innerHTML = projects.map(p => `
    <div class="premium-card" style="cursor:pointer;" onclick="switchSuperPanel('report'); showSuperToast('Selected project: ' + '${p.name}');">
      <div style="height:140px;overflow:hidden;position:relative;">
        <img src="${p.image || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600'}" style="width:100%;height:100%;object-fit:cover;" alt="${p.name}">
        <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(11,31,58,0.75),transparent);display:flex;align-items:flex-end;padding:12px;">
          <div>
            <div style="color:var(--white);font-weight:700;font-size:1.1rem;">${p.name}</div>
          </div>
        </div>
      </div>
      <div style="padding:14px;">
        <div class="badge badge-navy mb-8">${p.type}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin:4px 0 10px;">📍 ${p.location}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:0.8rem">Progress</span>
          <strong style="color:var(--orange);">${p.progress}%</strong>
        </div>
        <div class="progress-bar-wrap" style="height:6px;"><div class="progress-bar-fill" style="width:${p.progress}%"></div></div>
      </div>
    </div>
  `).join('');
}

// ── Navigation panel switching ─────────────────────────────────
function switchSuperPanel(id) {
  document.querySelectorAll('.super-panel').forEach(p => {
    p.classList.add('hidden');
    p.style.display = '';
  });
  const target = document.getElementById('sp-' + id);
  if (target) {
    target.classList.remove('hidden');
    target.style.display = '';
  }
  setActiveNav(id);
}
window.switchSuperPanel = switchSuperPanel;

// ── Toast ──────────────────────────────────────────────────────
function showSuperToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const user = authGuard('supervisor');
  if (!user) return;
  fillSidebarUser();
  initSidebar();
  renderAttendance();
  renderMaterials();
  renderAssignedProjects();
  switchSuperPanel('projects');

  const dateEl = document.getElementById('topbar-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', year:'numeric', month:'short', day:'numeric' });

  // Set today's date defaults
  const reportDateEl = document.getElementById('report-date');
  if (reportDateEl) reportDateEl.value = new Date().toISOString().split('T')[0];
});
