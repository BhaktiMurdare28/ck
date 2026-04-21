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

// ── Load live project data from API ───────────────────────────
async function loadClientProjects() {
  try {
    const token = getToken();
    if (!token) return;
    const res = await fetch('/api/projects', { headers: apiHeaders() });
    if (!res.ok) return;
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
  
  if (CLIENT_PROJECTS.length === 0) {
    wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);">No active projects found.</div>';
    return;
  }

  wrap.innerHTML = CLIENT_PROJECTS.map(p => `
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
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:0.85rem;font-weight:600;color:var(--text-dark);">Progress</span>
          <span style="font-family:'Outfit',sans-serif;font-size:1.1rem;font-weight:800;color:var(--blue);">${p.progress}%</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${p.progress}%;transition:width 1.2s ease;"></div>
        </div>
        <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:0.78rem;color:var(--text-muted);">Est. End: <strong style="color:var(--text-dark);">${p.endDate || 'TBD'}</strong></div>
          <button class="btn-outline" style="padding:6px 14px;font-size:0.8rem;white-space:nowrap;" onclick="openQuickModal(${p.id})"><i class="fa-solid fa-bolt" style="margin-right:4px;"></i> Quick Size</button>
        </div>
      </div>
    </div>
  `).join('');
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

// ── Open project detail view ──────────────────────────────────
function openProjectView(idOrName, isRealtimeUpdate = false) {
  let p;
  if (typeof idOrName === 'string') {
    p = CLIENT_PROJECTS.find(x => x.name === idOrName || x._id === idOrName);
  } else {
    p = CLIENT_PROJECTS.find(x => x.id === idOrName);
  }
  if (!p) return;

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
    <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="#8B5CF6" stroke-width="12"
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
    outputEl.textContent = '<i class="fa-solid fa-triangle-exclamation"></i> Rate unavailable';
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

async function renderClientGallery() {
  const grid = document.getElementById('client-gallery-grid');
  if (!grid) return;
  grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);grid-column:1/-1;">Loading gallery...</div>';

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
    // Show placeholder photos
    allGalleryPhotos = [
      { src: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=400', project: 'Sample', date: '', stage: 'Foundation', category: 'foundation', submittedBy: '' },
      { src: 'https://images.unsplash.com/photo-1541888081688-ce7d91e604f6?q=80&w=400', project: 'Sample', date: '', stage: 'Structure', category: 'structure', submittedBy: '' },
      { src: 'https://images.unsplash.com/photo-1560184897-ae75f418493e?q=80&w=400', project: 'Sample', date: '', stage: 'Finishing', category: 'finishing', submittedBy: '' },
    ];
  }

  applyGalleryFilter();
}
window.renderClientGallery = renderClientGallery;

function applyGalleryFilter() {
  const grid = document.getElementById('client-gallery-grid');
  if (!grid) return;

  const filtered = currentGalleryFilter === 'all' ? allGalleryPhotos : allGalleryPhotos.filter(p => p.category === currentGalleryFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);grid-column:1/-1;">No photos found in "${currentGalleryFilter}" category.</div>`;
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

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const user = authGuard('client');
  if (!user) return;
  fillSidebarUser();
  initSidebar();

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
