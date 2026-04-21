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
const http     = require('http');
const { Server } = require('socket.io');

/* ── Models ─────────────────────────────────────────────────── */
const User        = require('./models/User');
const Project     = require('./models/Project');
const Attendance  = require('./models/Attendance');
const Material    = require('./models/Material');
const Measurement = require('./models/Measurement');
const DailyReport = require('./models/DailyReport');
const Sanction    = require('./models/Sanction');
const Document    = require('./models/Document');
const CompletedProject = require('./models/CompletedProject');
const Message     = require('./models/Message');

/* ── App setup ──────────────────────────────────────────────── */
const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ck_fallback_secret';

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

function broadcastUpdate() {
  if (io) io.emit('data_updated', { time: Date.now() });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ── Block access to sensitive server-side files ──────────────── */
const BLOCKED = /^\/(server\.js|seed\.js|build-client\.js|\.env|package\.json|package-lock\.json|launch\.json|settings\.json|models|node_modules)/i;
app.use((req, res, next) => {
  if (BLOCKED.test(req.path)) return res.status(403).end();
  next();
});

/* ── Static files (served from public folder) ─────────────────── */
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

function resolveStoredPath(uploadPath) {
  if (!uploadPath) return null;
  return path.join(__dirname, uploadPath.replace(/^[/\\]+/, ''));
}

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
   ROUTES — Users Management (Admin can see supervisors/clients)
   ═══════════════════════════════════════════════════════════════ */
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const { role } = req.query;
    const filter = {};
    if (role) filter.role = role;
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
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
    broadcastUpdate();
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
    broadcastUpdate();
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.put('/api/projects/:id/progress', authMiddleware, async (req, res) => {
  try {
    const { progress, stageIndex, note } = req.body;
    let actualProgress = progress;
    
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Update the specific stage
    if (typeof stageIndex === 'number' && project.stages[stageIndex]) {
      project.stages[stageIndex].pct = Math.min(actualProgress, 100);

      // If stage reaches 100% (or remainingWork is 0), mark it done and activate next pending stage
      if (actualProgress >= 100) {
        project.stages[stageIndex].status = 'done';

        // Find and activate the next pending stage
        const nextPending = project.stages.findIndex((s, i) => i > stageIndex && s.status === 'pending');
        if (nextPending !== -1) {
          project.stages[nextPending].status = 'active';
        }
      }
    }

    // Recalculate overall progress as average of all stage percentages
    if (project.stages && project.stages.length > 0) {
      const totalPct = project.stages.reduce((sum, s) => sum + (s.pct || 0), 0);
      project.progress = Math.round(totalPct / project.stages.length);
    } else {
      project.progress = actualProgress;
    }

    // Auto-set status to 'completed' if all stages are done
    if (project.stages && project.stages.length > 0 && project.stages.every(s => s.status === 'done')) {
      project.status = 'completed';
    }

    await project.save();
    broadcastUpdate();
    res.json(project);
  } catch (err) {
    console.error('Progress update error:', err);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

app.delete('/api/projects/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' });
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
    const record = await Attendance.create({
      ...req.body,
      submittedBy: req.user.name || ''
    });
    broadcastUpdate();
    res.status(201).json(record);
  } catch (err) {
    console.error('Attendance create error:', err);
    res.status(500).json({ error: 'Failed to save attendance' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ROUTES — Materials
   ═══════════════════════════════════════════════════════════════ */
app.get('/api/materials', authMiddleware, async (req, res) => {
  try {
    const { project } = req.query;
    const filter = {};
    if (project) filter.project = project;
    const materials = await Material.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json(materials);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

app.post('/api/materials', authMiddleware, async (req, res) => {
  try {
    const mat = await Material.create({
      item: req.body.item,
      qty: req.body.qty,
      unit: req.body.unit,
      date: req.body.date || new Date().toISOString().split('T')[0],
      project: req.body.project || '',
      submittedBy: req.user.name || ''
    });
    broadcastUpdate();
    res.status(201).json(mat);
  } catch (err) {
    console.error('Material create error:', err);
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
    const meas = await Measurement.create({
      project: req.body.project || '',
      projectType: req.body.projectType || 'Building',
      date: req.body.date || new Date().toISOString().split('T')[0],
      fields: req.body.fields || {},
      notes: req.body.notes || '',
      submittedBy: req.user.name || ''
    });
    broadcastUpdate();
    res.status(201).json(meas);
  } catch (err) {
    console.error('Measurement create error:', err);
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
    const reports = await DailyReport.find().sort({ createdAt: -1 }).limit(50);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

app.post('/api/reports', authMiddleware, async (req, res) => {
  try {
    const report = await DailyReport.create({
      project: req.body.project || '',
      date: req.body.date || new Date().toISOString().split('T')[0],
      weather: req.body.weather || '',
      stage: req.body.stage || '',
      workDone: req.body.workDone || '',
      issues: req.body.issues || '',
      photos: req.body.photos || [],
      expenses: req.body.expenses || { labour: 0, material: 0, misc: 0, description: '' },
      submittedBy: req.user.name || '',
      submittedById: req.user.id
    });

    // Update project finance if expenses provided
    if (req.body.expenses && req.body.project) {
      const exp = req.body.expenses;
      const totalExpense = (exp.labour || 0) + (exp.material || 0) + (exp.misc || 0);
      if (totalExpense > 0) {
        const project = await Project.findOne({ name: req.body.project });
        if (project) {
          project.spent   = (project.spent || 0) + totalExpense;
          project.labour  = (project.labour || 0) + (exp.labour || 0);
          project.material= (project.material || 0) + (exp.material || 0);
          project.misc    = (project.misc || 0) + (exp.misc || 0);
          await project.save();
        }
      }
    }

    broadcastUpdate();
    res.status(201).json(report);
  } catch (err) {
    console.error('Report create error:', err);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// Expense aggregation for admin finance
app.get('/api/reports/expenses', authMiddleware, async (req, res) => {
  try {
    const reports = await DailyReport.find({ 'expenses.labour': { $gt: 0 } }).sort({ createdAt: -1 }).limit(100);
    const byProject = {};
    reports.forEach(r => {
      const name = r.project || 'Unknown';
      if (!byProject[name]) byProject[name] = { labour: 0, material: 0, misc: 0, total: 0, reports: 0 };
      byProject[name].labour += r.expenses.labour || 0;
      byProject[name].material += r.expenses.material || 0;
      byProject[name].misc += r.expenses.misc || 0;
      byProject[name].total += (r.expenses.labour || 0) + (r.expenses.material || 0) + (r.expenses.misc || 0);
      byProject[name].reports++;
    });
    res.json({ reports, byProject });
  } catch (err) {
    res.status(500).json({ error: 'Failed to aggregate expenses' });
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
   ROUTES — Document Management (Compliance Tracking)
   ═══════════════════════════════════════════════════════════════ */

// Get all documents for a project
app.get('/api/documents', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    
    const documents = await Document.find({ projectId }).sort({ category: 1, docType: 1 });
    res.json(documents);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get single document by ID
app.get('/api/documents/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Create/upload document
app.post('/api/documents', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { projectId, projectName, docType, category, name, description, expiryDate } = req.body;
    
    const docData = {
      projectId,
      projectName,
      docType,
      category,
      name,
      description,
      uploadedBy: req.user.email || req.user.id,
      uploadedDate: new Date(),
      status: 'uploaded',
      expiryDate: expiryDate ? new Date(expiryDate) : null
    };
    
    if (req.file) {
      docData.uploadPath = `/uploads/${req.file.filename}`;
      docData.fileName = req.file.originalname;
      docData.fileSize = req.file.size;
    }
    
    const doc = await Document.create(docData);
    broadcastUpdate();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create document' });
  }
});

// Update document status (approval workflow)
app.put('/api/documents/:id', authMiddleware, async (req, res) => {
  try {
    const { status, approvalRemarks, rejectionReason, approvedBy, expiryDate } = req.body;
    
    const updateData = {};
    if (status) updateData.status = status;
    if (approvalRemarks) updateData.approvalRemarks = approvalRemarks;
    if (rejectionReason) updateData.rejectionReason = rejectionReason;
    if (approvedBy) updateData.approvedBy = approvedBy;
    if (expiryDate) updateData.expiryDate = new Date(expiryDate);
    if (status === 'approved') updateData.approvalDate = new Date();
    
    const doc = await Document.findByIdAndUpdate(req.params.id, updateData, { new: true });
    broadcastUpdate();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete document
app.delete('/api/documents/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findByIdAndDelete(req.params.id);
    if (doc && doc.uploadPath) {
      try {
        const absPath = resolveStoredPath(doc.uploadPath);
        if (absPath && fs.existsSync(absPath)) fs.unlinkSync(absPath);
      } catch (e) {
        console.error('Failed to delete file:', e);
      }
    }
    broadcastUpdate();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Generate document from template (mock implementation)
app.post('/api/documents/:id/generate', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    
    const project = await Project.findById(doc.projectId);
    
    // Generate mock document content based on docType
    let content = generateDocumentContent(doc.docType, project, doc);
    
    // Save generated document
    const fileName = `${doc.docType}-${Date.now()}.html`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, content);
    
    const updateData = {
      uploadPath: `/uploads/${fileName}`,
      fileName: `${doc.name}.html`,
      status: 'uploaded',
      generatedFrom: `template-${doc.docType}`,
      generatedDate: new Date(),
      generationData: req.body
    };
    
    const updatedDoc = await Document.findByIdAndUpdate(req.params.id, updateData, { new: true });
    broadcastUpdate();
    res.json(updatedDoc);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to generate document' });
  }
});

// Generate and store template document by type/project (creates doc if missing)
app.post('/api/documents/generate-template', authMiddleware, async (req, res) => {
  try {
    const { projectId, projectName, docType, category, name } = req.body;
    if (!docType) return res.status(400).json({ error: 'docType required' });

    let project = null;
    if (projectId && mongoose.Types.ObjectId.isValid(String(projectId))) {
      project = await Project.findById(projectId);
    }
    if (!project && projectName) {
      project = await Project.findOne({ name: projectName });
    }
    if (!project) {
      project = await Project.findOne().sort({ createdAt: -1 });
    }
    if (!project) return res.status(404).json({ error: 'Project not found for template generation' });

    let doc = await Document.findOne({ projectId: project._id, docType });
    if (!doc) {
      doc = await Document.create({
        projectId: project._id,
        projectName: project.name,
        docType,
        category: category || 'execution',
        name: name || `${docType.replace(/-/g, ' ').toUpperCase()} - ${project.name}`,
        status: 'missing'
      });
    }

    const content = generateDocumentContent(doc.docType, project, doc);
    const fileName = `${doc.docType}-${Date.now()}.html`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, content, 'utf8');

    doc.uploadPath = `/uploads/${fileName}`;
    doc.fileName = `${doc.name}.html`;
    doc.status = 'uploaded';
    doc.generatedFrom = `template-${doc.docType}`;
    doc.generatedDate = new Date();
    doc.uploadedBy = req.user.email || req.user.id;
    doc.uploadedDate = new Date();
    doc.generationData = req.body;
    await doc.save();

    broadcastUpdate();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to generate template document' });
  }
});

// Download document
app.get('/api/documents/:id/download', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc || !doc.uploadPath) return res.status(404).json({ error: 'Document file not found' });
    
    const filePath = resolveStoredPath(doc.uploadPath);
    if (!filePath || !fs.existsSync(filePath)) return res.status(404).json({ error: 'Stored file missing on server' });
    res.download(filePath, doc.fileName || doc.name);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download document' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ROUTES — Contact Messages
   ═══════════════════════════════════════════════════════════════ */
app.get('/api/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 }).limit(50);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const msg = await Message.create({
      name: req.body.name || '',
      email: req.body.email || '',
      subject: req.body.subject || 'Contact Submission',
      message: req.body.message || req.body.content || ''
    });
    broadcastUpdate();
    res.status(201).json(msg);
  } catch (err) {
    console.error('Message create error:', err);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

app.delete('/api/messages/:id', authMiddleware, async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ROUTES — Workers (static list for attendance)
   ═══════════════════════════════════════════════════════════════ */
// Workers are now managed per-supervisor in localStorage + API
// This endpoint is kept for backward compatibility
app.get('/api/workers', authMiddleware, (req, res) => {
  res.json([]);
});

/* ═══════════════════════════════════════════════════════════════
   UTILITY — Document Generation Templates
   ═══════════════════════════════════════════════════════════════ */
function generateDocumentContent(docType, project, doc) {
  const today = new Date().toLocaleDateString('en-IN');
  const projectName = project?.name || doc.projectName || 'Project';
  const projectLocation = project?.location || 'Location';
  const projectType = project?.type || 'Construction';
  const company = 'Core Konstruct';
  
  const templates = {
    'boq': `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Bill of Quantities</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #0b1f3a; border-bottom: 3px solid #3B82F6; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 12px; text-align: left; border: 1px solid #ddd; }
          th { background-color: #3B82F6; color: white; }
          .total { font-weight: bold; background-color: #f0f0f0; }
        </style>
      </head>
      <body>
        <h1>Bill of Quantities (BOQ)</h1>
        <p><strong>Project:</strong> ${projectName}</p>
        <p><strong>Location:</strong> ${projectLocation}</p>
        <p><strong>Type:</strong> ${projectType}</p>
        <p><strong>Generated on:</strong> ${today}</p>
        
        <table>
          <tr>
            <th>Item</th>
            <th>Description</th>
            <th>Unit</th>
            <th>Quantity</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
          <tr>
            <td>1</td>
            <td>Foundation Work - Excavation & Leveling</td>
            <td>Sq.m</td>
            <td>500</td>
            <td>₹250</td>
            <td>₹125,000</td>
          </tr>
          <tr>
            <td>2</td>
            <td>Concrete Work - Foundation</td>
            <td>Cum</td>
            <td>150</td>
            <td>₹4,500</td>
            <td>₹675,000</td>
          </tr>
          <tr>
            <td>3</td>
            <td>Brickwork - Superstructure</td>
            <td>Cum</td>
            <td>200</td>
            <td>₹1,200</td>
            <td>₹240,000</td>
          </tr>
          <tr class="total">
            <td colspan="5">TOTAL</td>
            <td>₹1,040,000</td>
          </tr>
        </table>
        
        <p style="margin-top: 30px; color: #666;">
          <em>This is an auto-generated BOQ. Please verify all quantities and rates.</em>
        </p>
      </body>
      </html>
    `,
    
    'work-order': `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Work Order</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          h1 { color: #0b1f3a; margin: 0; }
          .ref-no { color: #666; margin-top: 5px; }
          .content { line-height: 1.8; }
          .section { margin-bottom: 20px; }
          strong { color: #0b1f3a; }
          .signature-line { width: 200px; border-top: 1px solid #333; margin-top: 40px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>WORK ORDER</h1>
          <div class="ref-no">WO/${Date.now()}</div>
        </div>
        
        <div class="content">
          <div class="section">
            <strong>Project Name:</strong> ${projectName}<br>
            <strong>Location:</strong> ${projectLocation}<br>
            <strong>Project Type:</strong> ${projectType}<br>
            <strong>Date:</strong> ${today}
          </div>
          
          <div class="section">
            <strong>Scope of Work:</strong><br>
            This work order authorizes the commencement of construction work as per the approved plans and specifications.
          </div>
          
          <div class="section">
            <strong>Terms & Conditions:</strong>
            <ul>
              <li>Work shall be executed as per approved design and specifications</li>
              <li>Safety standards must be adhered to at all times</li>
              <li>Progress reports must be submitted weekly</li>
              <li>Quality control inspections will be conducted regularly</li>
            </ul>
          </div>
          
          <div class="section">
            <strong>Authorization:</strong><br>
            <div class="signature-line" style="margin-top: 60px;"></div>
            <p style="margin-top: 10px; color: #666;">Project Manager</p>
          </div>
        </div>
      </body>
      </html>
    `,
    
    'completion-certificate': `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Project Completion Certificate</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; background: #f9f9f9; }
          .certificate { background: white; padding: 40px; border: 3px solid #0b1f3a; }
          .header { text-align: center; margin-bottom: 30px; }
          h1 { color: #0b1f3a; font-size: 28px; }
          .content { text-align: center; line-height: 2; font-size: 14px; }
          .stamp { text-align: right; margin-top: 40px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="header">
            <h1>CERTIFICATE OF COMPLETION</h1>
          </div>
          
          <div class="content">
            <p>This is to certify that the construction work for</p>
            <p><strong>${projectName}</strong></p>
            <p>located at <strong>${projectLocation}</strong></p>
            <p>has been completed as per the approved specifications and contract terms</p>
            <p>as on <strong>${today}</strong></p>
            
            <p style="margin-top: 40px;">The work has been inspected and found to be satisfactory.</p>
            
            <div style="margin-top: 60px; text-align: right;">
              <p>________________</p>
              <p>Project Engineer</p>
            </div>
          </div>
          
          <div class="stamp">
            <p>Generated: ${new Date().toLocaleString('en-IN')}</p>
          </div>
        </div>
      </body>
      </html>
    `,

    'sanction-plan': `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Sanction Plan</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #1f2937; }
          h1 { margin: 0 0 10px; color: #0b1f3a; }
          .meta { margin: 0 0 18px; color: #4b5563; }
          .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-top: 14px; }
        </style>
      </head>
      <body>
        <h1>Building Sanction Plan Cover Sheet</h1>
        <div class="meta">Generated by ${company} on ${today}</div>
        <div class="box">
          <p><strong>Project:</strong> ${projectName}</p>
          <p><strong>Location:</strong> ${projectLocation}</p>
          <p><strong>Type:</strong> ${projectType}</p>
          <p><strong>Authority:</strong> Local Municipal Corporation</p>
        </div>
        <div class="box">
          <p><strong>Checklist:</strong></p>
          <ul>
            <li>Site plan and layout attached</li>
            <li>FSI, setbacks, and coverage verified</li>
            <li>Fire compliance references attached</li>
            <li>Structural stability certificate references attached</li>
          </ul>
        </div>
      </body>
      </html>
    `,

    'rera-registration': `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>RERA Registration Summary</title><style>body{font-family:Arial,sans-serif;margin:28px;}h1{color:#0b1f3a;}table{border-collapse:collapse;width:100%;margin-top:16px;}td,th{border:1px solid #ddd;padding:10px;}th{background:#f3f4f6;text-align:left;}</style></head>
      <body>
        <h1>RERA Registration Summary</h1>
        <p><strong>Project:</strong> ${projectName}</p>
        <table>
          <tr><th>Field</th><th>Value</th></tr>
          <tr><td>Project Name</td><td>${projectName}</td></tr>
          <tr><td>Location</td><td>${projectLocation}</td></tr>
          <tr><td>Registration Date</td><td>${today}</td></tr>
          <tr><td>Promoter</td><td>${company}</td></tr>
          <tr><td>Status</td><td>Draft Generated</td></tr>
        </table>
      </body>
      </html>
    `,

    'insurance-certificate': `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Insurance Certificate Summary</title><style>body{font-family:Arial,sans-serif;margin:28px;line-height:1.7;}h1{color:#0b1f3a;} .tag{display:inline-block;padding:4px 10px;background:#dcfce7;color:#166534;border-radius:999px;font-size:12px;}</style></head>
      <body>
        <h1>Contractor Insurance Certificate Summary</h1>
        <p><strong>Project:</strong> ${projectName}</p>
        <p><strong>Location:</strong> ${projectLocation}</p>
        <p><strong>Issue Date:</strong> ${today}</p>
        <p><strong>Coverage:</strong> Workmen Compensation, Third-Party Liability, Plant & Machinery</p>
        <p><span class="tag">Generated Draft</span></p>
      </body>
      </html>
    `,

    'occupancy-cert': `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Occupancy Certificate Dossier</title><style>body{font-family:Arial,sans-serif;margin:30px;}h1{color:#0b1f3a;}ul{line-height:1.8;}</style></head>
      <body>
        <h1>Occupancy Certificate Dossier</h1>
        <p>This dossier is generated for submission tracking.</p>
        <p><strong>Project:</strong> ${projectName}</p>
        <p><strong>Date:</strong> ${today}</p>
        <ul>
          <li>Completion Certificate reference attached</li>
          <li>Fire NOC final reference attached</li>
          <li>Utility NOCs final references attached</li>
          <li>Building use compliance summary attached</li>
        </ul>
      </body>
      </html>
    `,

    'possession-letter': `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Possession Letter</title><style>body{font-family:Arial,sans-serif;margin:32px;line-height:1.8;}h1{color:#0b1f3a;} .sig{margin-top:50px;}</style></head>
      <body>
        <h1>Possession Letter (Draft)</h1>
        <p>Date: ${today}</p>
        <p>Subject: Handover and possession confirmation for <strong>${projectName}</strong>.</p>
        <p>This letter confirms readiness for possession handover subject to final sign-offs and dues reconciliation.</p>
        <p>Location: ${projectLocation}</p>
        <div class="sig">
          <p>For ${company}</p>
          <p>Authorized Signatory</p>
        </div>
      </body>
      </html>
    `
  };
  
  return templates[docType] || `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>${doc.name}</title></head>
    <body>
      <h1>${doc.name}</h1>
      <p>Document Type: ${docType}</p>
      <p>Project: ${projectName}</p>
      <p>Generated: ${today}</p>
      <p>This is a placeholder document. Custom template not yet implemented.</p>
    </body>
    </html>
  `;
}

/* ═══════════════════════════════════════════════════════════════
   CATCH-ALL — SPA fallback (serve landing page)
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
    console.log('\n  <i class="fa-solid fa-circle-check"></i>  MongoDB connected successfully');
    server.listen(PORT, () => {
      console.log(`  🚀  Core Konstruct API running`);
      console.log(`  🌐  Open: http://localhost:${PORT}\n`);
    });
  })
  .catch(err => {
    console.error('  <i class="fa-solid fa-circle-xmark"></i>  MongoDB connection failed:', err.message);
    process.exit(1);
  });
