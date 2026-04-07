/* ============================================================
   CORE KONSTRUCT — server.js
   Express API + Static File Server with MongoDB
   Run:  npm start   (or: node server.js)
   Then: http://localhost:3000
   ============================================================ */
require('dotenv').config();

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');
const multer   = require('multer');
const jwt      = require('jsonwebtoken');
const fs       = require('fs');

/* ── Models ─────────────────────────────────────────────────── */
const User        = require('./models/User');
const Project     = require('./models/Project');
const Attendance  = require('./models/Attendance');
const Material    = require('./models/Material');
const Measurement = require('./models/Measurement');
const DailyReport = require('./models/DailyReport');
const Sanction    = require('./models/Sanction');
const CompletedProject = require('./models/CompletedProject');
const Message     = require('./models/Message');

/* ── App setup ──────────────────────────────────────────────── */
const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ck_fallback_secret';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ── Static files (public folder = project root for HTML/CSS/JS) */
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ── Ensure uploads directory exists ────────────────────────── */
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

/* ── Multer (photo upload) ──────────────────────────────────── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E6);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) &&
               allowed.test(file.mimetype);
    cb(ok ? null : new Error('Only image files allowed'), ok);
  }
});

/* ═══════════════════════════════════════════════════════════════
   MIDDLEWARE — JWT Auth
   ═══════════════════════════════════════════════════════════════ */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/* ═══════════════════════════════════════════════════════════════
   ROUTES — Authentication
   ═══════════════════════════════════════════════════════════════ */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'All fields required' });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2);
    let roleLabel = role === 'admin' ? 'Contractor / Admin' : role === 'supervisor' ? 'Site Supervisor' : 'Client';

    const user = await User.create({ name, email, password, role, roleLabel, initials });
    
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name, initials: user.initials, roleLabel: user.roleLabel },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: { name: user.name, role: user.role, roleKey: user.role, roleLabel: user.roleLabel, initials: user.initials }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name, initials: user.initials, roleLabel: user.roleLabel },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { name: user.name, role: user.role, roleKey: user.role, roleLabel: user.roleLabel, initials: user.initials }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ name: user.name, role: user.role, roleKey: user.role, roleLabel: user.roleLabel, initials: user.initials });
  } catch (err) {
    res.status(500).json({ error: 'Server error during auth checks' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ROUTES — Messages / Contact
   ═══════════════════════════════════════════════════════════════ */
app.post('/api/messages', async (req, res) => {
  try {
    const msg = await Message.create(req.body);
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.get('/api/messages', authMiddleware, async (req, res) => {
  try {
    const msgs = await Message.find().sort({ createdAt: -1 });
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ROUTES — Projects
   ═══════════════════════════════════════════════════════════════ */
app.get('/api/projects', authMiddleware, async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.get('/api/projects/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

app.post('/api/projects', authMiddleware, async (req, res) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json(project);
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.put('/api/projects/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.put('/api/projects/:id/progress', authMiddleware, async (req, res) => {
  try {
    const { progress, stageIndex, note } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    project.progress = progress;
    if (typeof stageIndex === 'number' && project.stages[stageIndex]) {
      project.stages[stageIndex].pct = progress;
      if (progress >= 100) project.stages[stageIndex].status = 'done';
    }
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ROUTES — Completed Projects Archive
   ═══════════════════════════════════════════════════════════════ */
app.get('/api/completed-projects', async (req, res) => {
  try {
    const projects = await CompletedProject.find().sort({ completedYear: -1, createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch completed projects' });
  }
});

app.post('/api/completed-projects', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const cp = await CompletedProject.create(req.body);
    res.status(201).json(cp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add completed project' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ROUTES — Attendance
   ═══════════════════════════════════════════════════════════════ */
app.get('/api/attendance', authMiddleware, async (req, res) => {
  try {
    const { date, project } = req.query;
    const filter = {};
    if (date)    filter.date = date;
    if (project) filter.project = project;
    const records = await Attendance.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

app.post('/api/attendance', authMiddleware, async (req, res) => {
  try {
    const record = await Attendance.create(req.body);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save attendance' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ROUTES — Materials
   ═══════════════════════════════════════════════════════════════ */
app.get('/api/materials', authMiddleware, async (req, res) => {
  try {
    const materials = await Material.find().sort({ createdAt: -1 }).limit(100);
    res.json(materials);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

app.post('/api/materials', authMiddleware, async (req, res) => {
  try {
    const mat = await Material.create(req.body);
    res.status(201).json(mat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add material' });
  }
});

app.delete('/api/materials/:id', authMiddleware, async (req, res) => {
  try {
    await Material.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete material' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ROUTES — Measurements
   ═══════════════════════════════════════════════════════════════ */
app.post('/api/measurements', authMiddleware, async (req, res) => {
  try {
    const meas = await Measurement.create(req.body);
    res.status(201).json(meas);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save measurements' });
  }
});

app.get('/api/measurements', authMiddleware, async (req, res) => {
  try {
    const measurements = await Measurement.find().sort({ createdAt: -1 }).limit(50);
    res.json(measurements);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch measurements' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ROUTES — Daily Reports
   ═══════════════════════════════════════════════════════════════ */
app.get('/api/reports', authMiddleware, async (req, res) => {
  try {
    const reports = await DailyReport.find().populate('project').sort({ createdAt: -1 }).limit(50);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

app.post('/api/reports', authMiddleware, async (req, res) => {
  try {
    const report = await DailyReport.create({ ...req.body, submittedBy: req.user.id });
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ROUTES — Photo Upload
   ═══════════════════════════════════════════════════════════════ */
app.post('/api/upload', authMiddleware, upload.array('photos', 10), (req, res) => {
  try {
    const urls = req.files.map(f => `/uploads/${f.filename}`);
    res.json({ urls });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ROUTES — Sanction Documents
   ═══════════════════════════════════════════════════════════════ */
app.get('/api/sanctions', authMiddleware, async (req, res) => {
  try {
    const docs = await Sanction.find().sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sanctions' });
  }
});

app.post('/api/sanctions', authMiddleware, async (req, res) => {
  try {
    const doc = await Sanction.create(req.body);
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add sanction' });
  }
});

app.put('/api/sanctions/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await Sanction.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update sanction' });
  }
});

app.delete('/api/sanctions/:id', authMiddleware, async (req, res) => {
  try {
    await Sanction.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete sanction' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ROUTES — Workers (static list for attendance)
   ═══════════════════════════════════════════════════════════════ */
app.get('/api/workers', authMiddleware, (req, res) => {
  const WORKERS = [
    { id: 1, name: 'Ramesh K.',  initials: 'RK' },
    { id: 2, name: 'Suresh P.',  initials: 'SP' },
    { id: 3, name: 'Mahesh B.',  initials: 'MB' },
    { id: 4, name: 'Pradeep N.', initials: 'PN' },
    { id: 5, name: 'Vijay S.',   initials: 'VS' },
    { id: 6, name: 'Anand T.',   initials: 'AT' },
    { id: 7, name: 'Ganesh L.',  initials: 'GL' },
    { id: 8, name: 'Dinesh R.',  initials: 'DR' },
    { id: 9, name: 'Mohan C.',   initials: 'MC' },
    { id:10, name: 'Lokesh M.',  initials: 'LM' }
  ];
  res.json(WORKERS);
});

/* ═══════════════════════════════════════════════════════════════
   CATCH-ALL — SPA fallback (serve index.html)
   ═══════════════════════════════════════════════════════════════ */
app.get('*', (req, res) => {
  const filePath = path.join(__dirname, 'public', req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ═══════════════════════════════════════════════════════════════
   CONNECT TO MONGODB & START SERVER
   ═══════════════════════════════════════════════════════════════ */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('\n  ✅  MongoDB connected successfully');
    app.listen(PORT, () => {
      console.log(`  🚀  Core Konstruct API running`);
      console.log(`  🌐  Open: http://localhost:${PORT}\n`);
    });
  })
  .catch(err => {
    console.error('  ❌  MongoDB connection failed:', err.message);
    process.exit(1);
  });
