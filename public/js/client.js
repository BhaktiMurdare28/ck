/* ============================================================
   CORE KONSTRUCT — client.js
   Client dashboard: project progress, gallery, timeline
   FETCHES LIVE DATA FROM API
   ============================================================ */

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

// ── Client-visible project data (no financials) ───────────────
let CLIENT_PROJECTS = [];
let CURRENT_CLIENT_PROJECT = null;

let COMPLETED_PROJECTS = [
  {
    name: 'Green Valley Residency',
    type: 'Building',
    location: 'Pune, MH',
    completedYear: '2024',
    image: 'https://images.unsplash.com/photo-1560184897-ae75f418493e?q=80&w=600',
    desc: '12-storey luxury residential complex with 144 units.'
  },
  {
    name: 'Nagpur Ring Road Stretch',
    type: 'Road',
    location: 'Nagpur, MH',
    completedYear: '2024',
    image: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?q=80&w=600',
    desc: '18km 6-lane highway expansion completed ahead of schedule.'
  },
  {
    name: 'Old Town Canal Bridge',
    type: 'Bridge',
    location: 'Aurangabad, MH',
    completedYear: '2023',
    image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=600',
    desc: '80m pre-stressed concrete bridge over Kham river.'
  }
];

const DEMO_CLIENT_PROJECTS = [
  {
    _id: 'demo-1',
    id: 1,
    name: 'Skyline Residency Tower B',
    type: 'Building',
    location: 'Pune, MH',
    progress: 72,
    status: 'In Progress',
    currentStage: 'Finishing',
    startDate: '2025-07-10',
    endDate: '2026-07-25',
    milestone: 'Foundation ✓ | Structure ✓ | Brickwork ✓ | Finishing 72%',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200',
    photos: [
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=800',
      'https://images.unsplash.com/photo-1541888081688-ce7d91e604f6?q=80&w=800'
    ],
    timeline: [
      { date: 'Jul 2025', label: 'Foundation', done: true, active: false },
      { date: 'Sep 2025', label: 'Structure', done: true, active: false },
      { date: 'Dec 2025', label: 'Brickwork', done: true, active: false },
      { date: 'Apr 2026', label: 'Finishing', done: false, active: true },
      { date: 'Jul 2026', label: 'Handover', done: false, active: false }
    ]
  },
  {
    _id: 'demo-2',
    id: 2,
    name: 'Metro Link Service Road',
    type: 'Road',
    location: 'Nashik, MH',
    progress: 38,
    status: 'In Progress',
    currentStage: 'Structure',
    startDate: '2025-11-01',
    endDate: '2026-06-12',
    milestone: 'Planning ✓ | Foundation ✓ | Structure 38%',
    image: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?q=80&w=1200',
    photos: [
      'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=800'
    ],
    timeline: [
      { date: 'Nov 2025', label: 'Planning', done: true, active: false },
      { date: 'Jan 2026', label: 'Foundation', done: true, active: false },
      { date: 'Mar 2026', label: 'Structure', done: false, active: true },
      { date: 'May 2026', label: 'Finishing', done: false, active: false }
    ]
  }
];

const DEMO_CLIENT_UPDATES = [
  { title: 'Material delivery complete', desc: 'Cement and rebar delivery confirmed at site gate.', when: Date.now() - 1000 * 60 * 45 },
  { title: 'Stage advanced', desc: 'Skyline Residency moved from Brickwork to Finishing.', when: Date.now() - 1000 * 60 * 170 },
  { title: 'Photo evidence uploaded', desc: 'Supervisor uploaded 4 new finishing photos.', when: Date.now() - 1000 * 60 * 360 }
];

function useDemoProjects() {
  CLIENT_PROJECTS = DEMO_CLIENT_PROJECTS.map((p, idx) => ({ ...p, id: idx + 1 }));
}

function getDaysRemaining(endDate) {
  const t = Date.parse(endDate || '');
  if (!t) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

function getProjectHealth(project) {
  const pct = Number(project.progress || 0);
  if (pct >= 70) return { label: 'Healthy', className: 'good', icon: 'fa-heart-pulse' };
  if (pct >= 40) return { label: 'Watch', className: 'watch', icon: 'fa-eye' };
  return { label: 'At Risk', className: 'risk', icon: 'fa-triangle-exclamation' };
}

function getProjectRisk(project) {
  const days = getDaysRemaining(project.endDate);
  if (days === null) return { label: 'No ETA', className: 'safe', icon: 'fa-calendar' };
  if (days < 0) return { label: 'Overdue', className: 'overdue', icon: 'fa-clock' };
  if (days <= 21) return { label: `Due in ${days}d`, className: 'warning', icon: 'fa-hourglass-half' };
  return { label: `Due in ${days}d`, className: 'safe', icon: 'fa-flag-checkered' };
}

function timeAgo(ts) {
  const diffMin = Math.max(1, Math.floor((Date.now() - ts) / 60000));
  if (diffMin < 60) return `${diffMin}m ago`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Load live project data from API ───────────────────────────
async function loadClientProjects() {
  try {
    const token = getToken();
    if (!token) {
      useDemoProjects();
      return;
    }
    const res = await fetch('/api/projects', { headers: apiHeaders() });
    if (!res.ok) throw new Error('API responded with ' + res.status);
    const apiProjects = await res.json();
    const userStr = sessionStorage.getItem('ck_user');
    const uName = userStr ? JSON.parse(userStr).name : '';
    
    CLIENT_PROJECTS = [];
    apiProjects.forEach(ap => {
      // Strictly isolate projects for this client
      if (ap.client !== uName) return;

      CLIENT_PROJECTS.push({
        _id: ap._id,
        id: CLIENT_PROJECTS.length + 1,
        name: ap.name,
        type: ap.type || 'Building',
        location: ap.location || '',
        progress: ap.progress || 0,
        status: 'In Progress',
        currentStage: ap.stages && ap.stages.find(s => s.status === 'active') ? ap.stages.find(s => s.status === 'active').name : 'Planning',
        startDate: ap.startDate || '',
        endDate: ap.endDate || '',
        milestone: ap.stages ? ap.stages.map(s => {
          if (s.status === 'done') return s.name + ' ✓';
          if (s.status === 'active') return s.name + ' ' + s.pct + '%';
          return '';
        }).filter(Boolean).join('  |  ') : '',
        image: ap.image || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600',
        photos: [],
        timeline: ap.stages ? ap.stages.map(s => ({ date: '', label: s.name, done: s.status === 'done', active: s.status === 'active' })) : []
      });
    });
  } catch (err) {
    console.warn('Could not load projects for client:', err);
  }

  // Also load photos from reports
  try {
    const repRes = await fetch('/api/reports', { headers: apiHeaders() });
    if (repRes.ok) {
      const reports = await repRes.json();
      reports.forEach(r => {
        if (r.photos && r.photos.length) {
          const match = CLIENT_PROJECTS.find(p => p.name === r.project);
          if (match) {
            r.photos.forEach(ph => {
              if (!match.photos.includes(ph)) match.photos.push(ph);
            });
          }
        }
      });
    }
  } catch (err) {
    console.warn('Could not load report photos:', err);
  }

  if (CLIENT_PROJECTS.length === 0) {
    useDemoProjects();
  }
}

async function loadCompletedProjects() {
  try {
    const res = await fetch('/api/completed-projects');
    if (res.ok) {
      const apiCompleted = await res.json();
      if (apiCompleted.length > 0) {
        COMPLETED_PROJECTS = apiCompleted.map(cp => ({
          name: cp.name,
          type: cp.type || 'Building',
          location: cp.location || '',
          completedYear: cp.completedYear || '',
          image: cp.image || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600',
          desc: cp.desc || cp.description || ''
        }));
      }
    }
  } catch (err) {
    console.warn('Could not load completed projects:', err);
  }
}

// ── Render ongoing project cards ──────────────────────────────
function renderOngoingProjects() {
  const wrap = document.getElementById('ongoing-projects');
  if (!wrap) return;
  renderClientSummary();
  renderClientNotifications();
  
  if (CLIENT_PROJECTS.length === 0) {
    wrap.innerHTML = `
      <div class="dash-panel" style="grid-column:1/-1;padding:30px;text-align:center;">
        <p style="font-size:1rem;color:var(--text-muted);margin-bottom:12px;">No active projects found for your account yet.</p>
        <button class="btn-outline" onclick="renderOngoingProjects()"><i class="fa-solid fa-rotate-right" style="margin-right:6px;"></i> Refresh</button>
      </div>
    `;
    return;
  }

  wrap.innerHTML = CLIENT_PROJECTS.map(p => {
    const health = getProjectHealth(p);
    const risk = getProjectRisk(p);
    return `
    <div class="premium-card">
      <div style="height:180px;overflow:hidden;position:relative;cursor:pointer;" onclick="openProjectView(${p.id})">
        <img src="${p.image}" style="width:100%;height:100%;object-fit:cover;" alt="${p.name}">
        <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(11,31,58,0.75),transparent);display:flex;align-items:flex-end;padding:16px;">
          <div>
            <div class="badge badge-blue" style="margin-bottom:4px;">${p.currentStage}</div>
            <div style="color:var(--white);font-weight:700;font-size:1rem;">${p.name}</div>
          </div>
        </div>
      </div>
      <div style="padding:20px 24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:0.82rem;color:var(--text-muted);"><i class="fa-solid fa-location-dot"></i> ${p.location}</span>
          <span class="badge badge-success">${p.status}</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
          <span class="health-chip ${health.className}"><i class="fa-solid ${health.icon}"></i> ${health.label}</span>
          <span class="risk-chip ${risk.className}"><i class="fa-solid ${risk.icon}"></i> ${risk.label}</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:0.85rem;font-weight:600;color:var(--text-dark);">Progress</span>
          <span style="font-family:'Outfit',sans-serif;font-size:1.1rem;font-weight:800;color:var(--blue);">${p.progress}%</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${p.progress}%;transition:width 1.2s ease;"></div>
        </div>
        <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:0.78rem;color:var(--text-muted);">Est. End: <strong style="color:var(--text-dark);">${p.endDate || 'TBD'}</strong></div>
          <button class="btn-outline" style="padding:6px 14px;font-size:0.8rem;white-space:nowrap;" onclick="openQuickModal(${p.id})"><i class="fa-solid fa-bolt" style="margin-right:4px;"></i> Quick View</button>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

function renderClientNotifications() {
  const feed = document.getElementById('client-notifications-feed');
  const count = document.getElementById('client-updates-count');
  if (!feed) return;

  const projectNotes = CLIENT_PROJECTS.map((p, i) => ({
    title: `${p.name} · ${p.currentStage}`,
    desc: `Progress is currently ${p.progress}%. Next milestone tracking is active for this project.`,
    when: Date.now() - (i + 1) * 1000 * 60 * 95
  }));

  const notes = [...projectNotes, ...DEMO_CLIENT_UPDATES]
    .sort((a, b) => b.when - a.when)
    .slice(0, 6);

  if (count) {
    count.textContent = `${notes.length} updates`;
  }

  feed.innerHTML = notes.map(n => `
    <div class="client-notice-item">
      <div class="client-notice-head">
        <div class="client-notice-title">${n.title}</div>
        <div class="client-notice-meta">${timeAgo(n.when)}</div>
      </div>
      <div class="client-notice-desc">${n.desc}</div>
    </div>
  `).join('');
}

function renderClientSummary() {
  const wrap = document.getElementById('client-summary-cards');
  if (!wrap) return;

  if (CLIENT_PROJECTS.length === 0) {
    wrap.innerHTML = '';
    return;
  }

  const total = CLIENT_PROJECTS.length;
  const avgProgress = Math.round(CLIENT_PROJECTS.reduce((sum, p) => sum + (p.progress || 0), 0) / total);
  const maxProgress = Math.max(...CLIENT_PROJECTS.map(p => p.progress || 0));
  const atRisk = CLIENT_PROJECTS.filter(p => (p.progress || 0) < 35).length;

  wrap.innerHTML = `
    <div class="client-summary-card">
      <div class="client-summary-label">Active Projects</div>
      <div class="client-summary-value">${total}</div>
    </div>
    <div class="client-summary-card">
      <div class="client-summary-label">Average Progress</div>
      <div class="client-summary-value">${avgProgress}%</div>
    </div>
    <div class="client-summary-card">
      <div class="client-summary-label">Top Completion</div>
      <div class="client-summary-value">${maxProgress}%</div>
    </div>
    <div class="client-summary-card">
      <div class="client-summary-label">Needs Attention</div>
      <div class="client-summary-value">${atRisk}</div>
    </div>
  `;
}

// ── Quick Modal Logic ─────────────────────────────────────────
window.currentQuickModalId = null;

function openQuickModal(id) {
  const p = CLIENT_PROJECTS.find(x => x.id === id);
  if (!p) return;
  window.currentQuickModalId = id;
  
  document.getElementById('modal-qm-title').textContent = p.name;
  document.getElementById('modal-qm-type').textContent = p.type;
  document.getElementById('modal-qm-stage').textContent = p.currentStage;
  document.getElementById('modal-qm-loc').textContent = p.location;
  document.getElementById('modal-qm-prog-text').textContent = p.progress + '%';
  document.getElementById('modal-qm-prog-bar').style.width = '0%';
  setTimeout(() => { document.getElementById('modal-qm-prog-bar').style.width = p.progress + '%'; }, 50);
  document.getElementById('modal-qm-start').textContent = p.startDate || 'N/A';
  document.getElementById('modal-qm-end').textContent = p.endDate || 'N/A';

  const modal = document.getElementById('quick-project-modal');
  modal.classList.remove('hidden');
  void modal.offsetWidth; // Trigger reflow
  modal.style.opacity = '1';
  modal.style.pointerEvents = 'auto';
  document.getElementById('quick-project-modal-content').style.transform = 'scale(1)';
}
window.openQuickModal = openQuickModal;

function closeQuickModal() {
  const modal = document.getElementById('quick-project-modal');
  modal.style.opacity = '0';
  modal.style.pointerEvents = 'none';
  document.getElementById('quick-project-modal-content').style.transform = 'scale(0.95)';
  setTimeout(() => modal.classList.add('hidden'), 300);
}
window.closeQuickModal = closeQuickModal;

document.addEventListener('click', (e) => {
  const modal = document.getElementById('quick-project-modal');
  if (modal && !modal.classList.contains('hidden') && e.target === modal) {
    closeQuickModal();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;

  const modal = document.getElementById('quick-project-modal');
  if (modal && !modal.classList.contains('hidden')) {
    closeQuickModal();
  }

  const lightbox = document.querySelector('.lightbox-overlay');
  if (lightbox) {
    lightbox.remove();
  }
});

// ── Open project detail view ──────────────────────────────────
function openProjectView(idOrName, isRealtimeUpdate = false) {
  let p;
  if (typeof idOrName === 'string') {
    p = CLIENT_PROJECTS.find(x => x.name === idOrName || x._id === idOrName);
  } else {
    p = CLIENT_PROJECTS.find(x => x.id === idOrName);
  }
  if (!p) return;
  CURRENT_CLIENT_PROJECT = p;

  // Switch to detail panel if not a seamless refresh
  if (!isRealtimeUpdate) switchClientPanel('detail');

  // Cover image
  const coverImg = document.getElementById('detail-cover-img');
  if (coverImg) coverImg.src = p.image;

  // Set all detail-name elements (banner + any other)
  document.querySelectorAll('#detail-name').forEach(el => el.textContent = p.name);
  document.querySelectorAll('#detail-type').forEach(el => el.textContent = p.type);
  document.querySelectorAll('#detail-location').forEach(el => el.textContent = p.location);
  
  const stageEl = document.getElementById('detail-stage');
  if (stageEl) stageEl.textContent = p.currentStage;
  const detailHealth = document.getElementById('detail-health');
  const detailRisk = document.getElementById('detail-risk');
  const health = getProjectHealth(p);
  const risk = getProjectRisk(p);
  if (detailHealth) {
    detailHealth.textContent = health.label;
    detailHealth.className = `health-chip ${health.className}`;
  }
  if (detailRisk) {
    detailRisk.textContent = risk.label;
    detailRisk.className = `risk-chip ${risk.className}`;
  }
  const pctLabel = document.getElementById('detail-pct-label');
  if (pctLabel) pctLabel.textContent = p.progress + '%';
  const milestoneEl = document.getElementById('detail-milestone');
  if (milestoneEl) milestoneEl.textContent = p.milestone;

  // Progress bar
  const barFill = document.getElementById('detail-bar-fill');
  if (barFill) { 
    if (!isRealtimeUpdate) {
      barFill.style.width = '0%'; 
      setTimeout(() => barFill.style.width = p.progress + '%', 100); 
    } else {
      barFill.style.width = p.progress + '%';
    }
  }

  // Pct label
  const pctLabel2 = document.getElementById('detail-pct-label-2');
  if (pctLabel2) pctLabel2.textContent = p.progress + '%';

  // Ring
  renderClientRing(p.progress);

  // Timeline
  const tl = document.getElementById('detail-timeline');
  if (tl) {
    tl.innerHTML = p.timeline.map(t => `
      <div class="timeline-item ${t.done ? 'done' : t.active ? 'active' : ''}">
        <div class="timeline-date">${t.date}</div>
        <div class="timeline-title">${t.label}</div>
      </div>
    `).join('');
  }

  // Gallery
  const gallery = document.getElementById('detail-gallery');
  if (gallery) {
    if (p.photos.length === 0) {
      gallery.innerHTML = '<div style="padding:20px;color:var(--text-muted);text-align:center;">No site photos available yet.</div>';
    } else {
      gallery.innerHTML = p.photos.map((src, i) => `
        <div class="gallery-img" onclick="openLightbox('${src}')">
          <img src="${src}" alt="Site photo ${i+1}">
        </div>
      `).join('');
    }
  }
}
window.openProjectView = openProjectView;

function exportClientSnapshot() {
  const p = CURRENT_CLIENT_PROJECT;
  if (!p) return;

  const timelineHtml = (p.timeline || []).map(t => `<li>${t.label} ${t.done ? '✓' : t.active ? '(Active)' : ''}</li>`).join('');
  const photosHtml = (p.photos || []).slice(0, 4).map(src => `<img src="${src}" style="width:48%;margin:1%;border-radius:8px;object-fit:cover;height:180px;" alt="Project photo">`).join('');
  const health = getProjectHealth(p).label;
  const risk = getProjectRisk(p).label;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`
    <html>
      <head><title>${p.name} Snapshot</title></head>
      <body style="font-family:Arial,sans-serif;padding:24px;color:#0f172a;">
        <h1 style="margin-bottom:0;">${p.name}</h1>
        <p style="margin-top:6px;color:#475569;">${p.type} · ${p.location}</p>
        <hr>
        <p><strong>Progress:</strong> ${p.progress}%</p>
        <p><strong>Stage:</strong> ${p.currentStage}</p>
        <p><strong>Health:</strong> ${health}</p>
        <p><strong>Deadline:</strong> ${risk}</p>
        <p><strong>Start:</strong> ${p.startDate || 'N/A'} &nbsp; <strong>End:</strong> ${p.endDate || 'N/A'}</p>
        <h3>Timeline</h3>
        <ul>${timelineHtml || '<li>No timeline data</li>'}</ul>
        <h3>Recent Site Photos</h3>
        <div>${photosHtml || '<p>No photos available.</p>'}</div>
      </body>
    </html>
  `);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
window.exportClientSnapshot = exportClientSnapshot;

// ── Client progress ring ───────────────────────────────────────
function renderClientRing(pct) {
  const svg = document.getElementById('client-ring');
  if (!svg) return;
  const size   = 140;
  const radius = 56;
  const circ   = 2 * Math.PI * radius;
  const offset = circ * (1 - pct / 100);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.innerHTML = `
    <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="12"/>
    <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="#3B82F6" stroke-width="12"
      stroke-linecap="round"
      stroke-dasharray="${circ}"
      stroke-dashoffset="${circ}"
      style="transition:stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1);stroke-dashoffset:${offset};"/>
  `;
}

// ── Completed projects ─────────────────────────────────────────
function renderCompletedProjects() {
  const grid = document.getElementById('completed-grid');
  if (!grid) return;
  
  if (COMPLETED_PROJECTS.length === 0) {
    grid.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);">No completed projects found.</div>';
    return;
  }

  grid.innerHTML = COMPLETED_PROJECTS.map(p => `
    <div class="premium-card" style="overflow:hidden;">
      <div style="height:200px;overflow:hidden;position:relative;">
        <img src="${p.image}" style="width:100%;height:100%;object-fit:cover;" alt="${p.name}">
        <div style="position:absolute;top:12px;right:12px;" class="badge badge-success">✓ Completed ${p.completedYear}</div>
      </div>
      <div style="padding:20px 24px;">
        <div class="badge badge-navy mb-8">${p.type}</div>
        <h3 style="margin:8px 0 6px;font-size:1.05rem;">${p.name}</h3>
        <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:8px;"><i class="fa-solid fa-location-dot"></i> ${p.location}</p>
        <p style="font-size:0.85rem;color:var(--text-mid);">${p.desc}</p>
      </div>
    </div>
  `).join('');
}

// ── Lightbox ───────────────────────────────────────────────────
function openLightbox(src) {
  const existing = document.querySelector('.lightbox-overlay');
  if (existing) existing.remove();
  const lb = document.createElement('div');
  lb.className = 'lightbox-overlay';
  lb.innerHTML = `
    <div class="lightbox-inner">
      <img src="${src}" alt="Site photo">
      <button class="lightbox-close" onclick="this.closest('.lightbox-overlay').remove()"><i class="fa-solid fa-xmark"></i></button>
    </div>
  `;
  lb.addEventListener('click', e => { if (e.target === lb) lb.remove(); });
  document.body.appendChild(lb);
}
window.openLightbox = openLightbox;

// ── Panel switching ────────────────────────────────────────────
function switchClientPanel(id) {
  document.querySelectorAll('.client-panel').forEach(p => {
    p.classList.add('hidden');
    p.style.display = '';
  });
  const target = document.getElementById('cp-' + id);
  if (target) {
    target.classList.remove('hidden');
    target.style.display = '';
  }
  setActiveNav(id);
}
window.switchClientPanel = switchClientPanel;

// ═══════════════════════════════════════════════════════════════
// CURRENCY CONVERTER — Real-time rates
// ═══════════════════════════════════════════════════════════════
let exchangeRatesCache = null;
let ratesCacheTime = 0;

async function fetchExchangeRates(base) {
  const now = Date.now();
  if (exchangeRatesCache && exchangeRatesCache._base === base && (now - ratesCacheTime) < 600000) {
    return exchangeRatesCache;
  }
  try {
    const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);
    if (res.ok) {
      const data = await res.json();
      data._base = base;
      exchangeRatesCache = data;
      ratesCacheTime = now;
      return data;
    }
  } catch (err) {
    console.warn('Exchange rate API failed:', err);
  }
  return null;
}

async function convertCurrency() {
  const amountEl = document.getElementById('conv-amount');
  const fromEl = document.getElementById('conv-from');
  const toEl = document.getElementById('conv-to');
  const outputEl = document.getElementById('conv-output');
  const rateInfoEl = document.getElementById('conv-rate-info');
  if (!amountEl || !fromEl || !toEl || !outputEl) return;

  const amount = parseFloat(amountEl.value) || 0;
  const from = fromEl.value;
  const to = toEl.value;

  if (from === to) {
    outputEl.textContent = amount.toLocaleString('en-IN', { style: 'currency', currency: to });
    if (rateInfoEl) rateInfoEl.textContent = '1 ' + from + ' = 1 ' + to;
    return;
  }

  outputEl.textContent = 'Converting...';
  const data = await fetchExchangeRates(from);
  if (data && data.rates && data.rates[to]) {
    const rate = data.rates[to];
    const converted = amount * rate;
    outputEl.textContent = converted.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + to;
    if (rateInfoEl) rateInfoEl.textContent = `1 ${from} = ${rate.toFixed(4)} ${to} · Updated: ${new Date().toLocaleTimeString('en-IN')}`;

    // Render popular rates table
    renderPopularRates(data);
  } else {
    outputEl.textContent = 'Rate unavailable';
    if (rateInfoEl) rateInfoEl.textContent = 'Could not fetch exchange rates. Try again later.';
  }
}
window.convertCurrency = convertCurrency;

function renderPopularRates(data) {
  const wrap = document.getElementById('conv-popular-rates');
  if (!wrap || !data || !data.rates) return;

  const popular = ['USD', 'EUR', 'GBP', 'AED', 'JPY', 'CAD', 'AUD', 'SGD', 'CNY', 'INR'];
  const base = data._base || 'INR';
  const filtered = popular.filter(c => c !== base);

  wrap.innerHTML = `<table class="data-table"><thead><tr><th>Currency</th><th>Rate</th><th>1 Lakh ${base}</th></tr></thead><tbody>
    ${filtered.map(c => {
      const rate = data.rates[c];
      if (!rate) return '';
      const lakh = (100000 * rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `<tr>
        <td><strong>${c}</strong></td>
        <td style="font-family:Outfit,sans-serif;color:var(--blue);">${rate.toFixed(4)}</td>
        <td style="font-size:0.85rem;color:var(--text-mid);">${lakh}</td>
      </tr>`;
    }).join('')}
  </tbody></table>`;
}

function swapCurrencies() {
  const fromEl = document.getElementById('conv-from');
  const toEl = document.getElementById('conv-to');
  if (fromEl && toEl) {
    const tmp = fromEl.value;
    fromEl.value = toEl.value;
    toEl.value = tmp;
    exchangeRatesCache = null; // force refetch for new base
    convertCurrency();
  }
}
window.swapCurrencies = swapCurrencies;

// ═══════════════════════════════════════════════════════════════
// PROJECT GALLERY — Image grid with category filtering
// ═══════════════════════════════════════════════════════════════
let allGalleryPhotos = [];
let currentGalleryFilter = 'all';
let gallerySearchQuery = '';
let gallerySortMode = 'latest';

async function renderClientGallery() {
  const grid = document.getElementById('client-gallery-grid');
  if (!grid) return;
  grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);grid-column:1/-1;">Loading gallery photos...</div>';

  // Collect photos from reports
  allGalleryPhotos = [];
  try {
    const res = await fetch('/api/reports', { headers: apiHeaders() });
    if (res.ok) {
      const reports = await res.json();
      const userStr = sessionStorage.getItem('ck_user');
      const uName = userStr ? JSON.parse(userStr).name : '';
      
      reports.forEach(r => {
        if (r.photos && r.photos.length > 0) {
          // Get matching client project
          const match = CLIENT_PROJECTS.find(p => p.name === r.project);
          if (match) {
            r.photos.forEach(ph => {
              const stage = (r.stage || '').toLowerCase();
              let category = 'site';
              if (stage.includes('foundation') || stage.includes('planning')) category = 'foundation';
              else if (stage.includes('structure') || stage.includes('brickwork') || stage.includes('slab')) category = 'structure';
              else if (stage.includes('finishing') || stage.includes('handover') || stage.includes('plaster') || stage.includes('paint')) category = 'finishing';

              allGalleryPhotos.push({
                src: ph,
                project: r.project,
                date: r.date || '',
                stage: r.stage || 'General',
                category: category,
                submittedBy: r.submittedBy || 'Supervisor'
              });
            });
          }
        }
      });
    }
  } catch (err) {
    console.warn('Could not load gallery photos:', err);
  }

  if (allGalleryPhotos.length === 0) {
    // Demo gallery — 8 categorised construction site photos
    allGalleryPhotos = [
      { src: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=600', project: 'Mehta Residence',   date: '2026-04-28', stage: 'Foundation Work',   category: 'foundation', submittedBy: 'Arjun Singh' },
      { src: 'https://images.unsplash.com/photo-1590496793929-36417d3117de?q=80&w=600', project: 'Mehta Residence',   date: '2026-04-25', stage: 'Plinth Beam',       category: 'foundation', submittedBy: 'Arjun Singh' },
      { src: 'https://images.unsplash.com/photo-1541888081688-ce7d91e604f6?q=80&w=600', project: 'Mehta Residence',   date: '2026-04-22', stage: 'Column Casting',    category: 'structure',  submittedBy: 'Arjun Singh' },
      { src: 'https://images.unsplash.com/photo-1599707254369-90b4b4f4a9cb?q=80&w=600', project: 'NH-48 Widening',    date: '2026-04-21', stage: 'Brickwork GF',      category: 'structure',  submittedBy: 'Kavita Rao'  },
      { src: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=600', project: 'NH-48 Widening',    date: '2026-04-19', stage: 'Sub-base Laying',   category: 'structure',  submittedBy: 'Kavita Rao'  },
      { src: 'https://images.unsplash.com/photo-1560184897-ae75f418493e?q=80&w=600', project: 'Navi Mumbai Drain', date: '2026-04-17', stage: 'Plastering',        category: 'finishing',  submittedBy: 'Ravi Mehta'  },
      { src: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?q=80&w=600', project: 'Navi Mumbai Drain', date: '2026-04-14', stage: 'Internal Painting', category: 'finishing',  submittedBy: 'Ravi Mehta'  },
      { src: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=600', project: 'Mehta Residence',   date: '2026-04-12', stage: 'Tile Fixing',       category: 'finishing',  submittedBy: 'Arjun Singh' }
    ];
  }

  applyGalleryFilter();
}
window.renderClientGallery = renderClientGallery;

function applyGalleryFilter() {
  const grid = document.getElementById('client-gallery-grid');
  if (!grid) return;

  let filtered = currentGalleryFilter === 'all' ? [...allGalleryPhotos] : allGalleryPhotos.filter(p => p.category === currentGalleryFilter);

  if (gallerySearchQuery) {
    const q = gallerySearchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      (p.project || '').toLowerCase().includes(q) ||
      (p.stage || '').toLowerCase().includes(q)
    );
  }

  if (gallerySortMode === 'project') {
    filtered.sort((a, b) => (a.project || '').localeCompare(b.project || ''));
  } else {
    filtered.sort((a, b) => {
      const ad = Date.parse(a.date || '') || 0;
      const bd = Date.parse(b.date || '') || 0;
      return gallerySortMode === 'oldest' ? ad - bd : bd - ad;
    });
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);grid-column:1/-1;">No photos match your selected filters.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="premium-card" style="overflow:hidden;cursor:pointer;transition:transform 0.3s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'" onclick="openLightbox('${p.src}')">
      <div style="height:180px;overflow:hidden;">
        <img src="${p.src}" alt="${p.stage}" style="width:100%;height:100%;object-fit:cover;transition:transform 0.4s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
      </div>
      <div style="padding:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="badge badge-navy" style="font-size:0.72rem;">${p.stage}</span>
          ${p.date ? `<span style="font-size:0.72rem;color:var(--text-muted);">${p.date}</span>` : ''}
        </div>
        ${p.project !== 'Sample' ? `<div style="font-size:0.8rem;color:var(--text-mid);margin-top:6px;font-weight:600;">${p.project}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function filterGallery(category) {
  currentGalleryFilter = category;

  // Update active filter button styles
  document.querySelectorAll('#gallery-filters button').forEach(btn => {
    if (btn.dataset.filter === category) {
      btn.className = 'btn-primary';
    } else {
      btn.className = 'btn-outline';
    }
  });

  applyGalleryFilter();
}
window.filterGallery = filterGallery;

function setupGalleryControls() {
  const searchEl = document.getElementById('gallery-search');
  const sortEl = document.getElementById('gallery-sort');

  if (searchEl) {
    searchEl.addEventListener('input', (e) => {
      gallerySearchQuery = (e.target.value || '').trim();
      applyGalleryFilter();
    });
  }

  if (sortEl) {
    sortEl.addEventListener('change', (e) => {
      gallerySortMode = e.target.value || 'latest';
      applyGalleryFilter();
    });
  }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const user = authGuard('client');
  if (!user) return;
  fillSidebarUser();
  initSidebar();
  setupGalleryControls();

  const ongoingWrap = document.getElementById('ongoing-projects');
  if (ongoingWrap) {
    ongoingWrap.innerHTML = '<div style="grid-column:1/-1;padding:30px;text-align:center;color:var(--text-muted);">Loading projects...</div>';
  }

  // Load live data from API
  await Promise.all([loadClientProjects(), loadCompletedProjects()]);

  renderOngoingProjects();
  renderCompletedProjects();
  
  if (CLIENT_PROJECTS.length > 0) {
    // default to showing first project details
    openProjectView(CLIENT_PROJECTS[0].id);
    switchClientPanel('ongoing'); // but start on ongoing projects list
  } else {
    switchClientPanel('ongoing');
  }

  const dateEl = document.getElementById('topbar-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', year:'numeric', month:'short', day:'numeric' });

  // Pre-fetch exchange rates
  fetchExchangeRates('INR');

  // Socket.io Real-time updates
  if (typeof io !== 'undefined') {
    const socket = io();
    socket.on('data_updated', async () => {
      await loadClientProjects();
      renderOngoingProjects();
      
      // If detail panel is open, refresh it seamlessly
      const detailPanel = document.getElementById('cp-detail');
      if (detailPanel && !detailPanel.classList.contains('hidden') && CLIENT_PROJECTS.length > 0) {
        const detailName = document.getElementById('detail-name');
        if (detailName && detailName.textContent) {
           const p = CLIENT_PROJECTS.find(cp => cp.name === detailName.textContent);
           if (p) openProjectView(p.id, true);
        }
      }

      // If gallery is open, refresh it
      const galleryPanel = document.getElementById('cp-gallery');
      if (galleryPanel && !galleryPanel.classList.contains('hidden')) {
        renderClientGallery();
      }
    });
  }
});
