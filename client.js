/* ============================================================
   CORE KONSTRUCT — client.js
   Client dashboard: project progress, gallery, timeline
   ============================================================ */

// ── Client-visible project data (no financials) ───────────────
const CLIENT_PROJECTS = [
  {
    id: 1,
    name: 'City Center Complex',
    type: 'Building',
    location: 'Mumbai, MH',
    progress: 68,
    status: 'In Progress',
    currentStage: 'Brickwork',
    startDate: '01 Mar 2025',
    endDate: '30 Jun 2026',
    milestone: 'Foundation ✓  |  Structure ✓  |  Brickwork 85%',
    image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?q=80&w=600',
    photos: [
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=400',
      'https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?q=80&w=400',
      'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?q=80&w=400',
      'https://images.unsplash.com/photo-1518563172008-e56c5dfbaef6?q=80&w=400',
      'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?q=80&w=400',
      'https://images.unsplash.com/photo-1459767129954-1b1c1f9b9ace?q=80&w=400'
    ],
    timeline: [
      { date: 'Mar 2025', label: 'Project Started',   done: true },
      { date: 'May 2025', label: 'Foundation Complete',done: true },
      { date: 'Aug 2025', label: 'Structure Complete', done: true },
      { date: 'Dec 2025', label: 'Brickwork',          done: false, active: true },
      { date: 'Mar 2026', label: 'Plastering',         done: false },
      { date: 'Jun 2026', label: 'Handover',           done: false }
    ]
  }
];

const COMPLETED_PROJECTS = [
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

// ── Render ongoing project card ───────────────────────────────
function renderOngoingProjects() {
  const wrap = document.getElementById('ongoing-projects');
  if (!wrap) return;
  wrap.innerHTML = CLIENT_PROJECTS.map(p => `
    <div class="premium-card" style="cursor:pointer;" onclick="openProjectView(${p.id})">
      <div style="height:180px;overflow:hidden;position:relative;">
        <img src="${p.image}" style="width:100%;height:100%;object-fit:cover;" alt="${p.name}">
        <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(11,31,58,0.75),transparent);display:flex;align-items:flex-end;padding:16px;">
          <div>
            <div class="badge badge-orange" style="margin-bottom:4px;">${p.currentStage}</div>
            <div style="color:var(--white);font-weight:700;font-size:1rem;">${p.name}</div>
          </div>
        </div>
      </div>
      <div style="padding:20px 24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:0.82rem;color:var(--text-muted);">📍 ${p.location}</span>
          <span class="badge badge-success">${p.status}</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:0.85rem;font-weight:600;color:var(--navy);">Progress</span>
          <span style="font-family:'Outfit',sans-serif;font-size:1.1rem;font-weight:800;color:var(--orange);">${p.progress}%</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${p.progress}%;transition:width 1.2s ease;"></div>
        </div>
        <div style="margin-top:14px;font-size:0.78rem;color:var(--text-muted);">Est. Completion: <strong>${p.endDate}</strong></div>
      </div>
    </div>
  `).join('');
}

// ── Open project detail view ──────────────────────────────────
function openProjectView(id) {
  const p = CLIENT_PROJECTS.find(x => x.id === id);
  if (!p) return;

  // Switch to detail panel
  switchClientPanel('detail');

  document.getElementById('detail-name').textContent      = p.name;
  document.getElementById('detail-type').textContent      = p.type;
  document.getElementById('detail-location').textContent  = p.location;
  document.getElementById('detail-stage').textContent     = p.currentStage;
  document.getElementById('detail-pct-label').textContent = p.progress + '%';
  document.getElementById('detail-milestone').textContent = p.milestone;

  // Progress bar
  const barFill = document.getElementById('detail-bar-fill');
  if (barFill) { barFill.style.width = '0%'; setTimeout(() => barFill.style.width = p.progress + '%', 100); }

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
    gallery.innerHTML = p.photos.map((src, i) => `
      <div class="gallery-img" onclick="openLightbox('${src}')">
        <img src="${src}" alt="Site photo ${i+1}">
      </div>
    `).join('');
  }
}
window.openProjectView = openProjectView;

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
    <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="#EEF2F7" stroke-width="12"/>
    <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="#F97316" stroke-width="12"
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
  grid.innerHTML = COMPLETED_PROJECTS.map(p => `
    <div class="premium-card" style="overflow:hidden;">
      <div style="height:200px;overflow:hidden;position:relative;">
        <img src="${p.image}" style="width:100%;height:100%;object-fit:cover;" alt="${p.name}">
        <div style="position:absolute;top:12px;right:12px;" class="badge badge-success">✓ Completed ${p.completedYear}</div>
      </div>
      <div style="padding:20px 24px;">
        <div class="badge badge-navy mb-8">${p.type}</div>
        <h3 style="margin:8px 0 6px;font-size:1.05rem;">${p.name}</h3>
        <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:8px;">📍 ${p.location}</p>
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
      <button class="lightbox-close" onclick="this.closest('.lightbox-overlay').remove()">✕</button>
    </div>
  `;
  lb.addEventListener('click', e => { if (e.target === lb) lb.remove(); });
  document.body.appendChild(lb);
}
window.openLightbox = openLightbox;

// ── Panel switching ────────────────────────────────────────────
function switchClientPanel(id) {
  document.querySelectorAll('.client-panel').forEach(p => p.style.display = 'none');
  const target = document.getElementById('cp-' + id);
  if (target) target.style.display = 'block';
  setActiveNav(id);
}
window.switchClientPanel = switchClientPanel;

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const user = authGuard('client');
  if (!user) return;
  fillSidebarUser();
  initSidebar();
  renderOngoingProjects();
  renderCompletedProjects();
  switchClientPanel('ongoing');

  const dateEl = document.getElementById('topbar-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', year:'numeric', month:'short', day:'numeric' });
});
