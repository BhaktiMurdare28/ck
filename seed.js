/* ============================================================
   CORE KONSTRUCT — seed.js
   Seeds MongoDB with demo users, projects, and sanction docs
   Run:  npm run seed   (or: node seed.js)
   ============================================================ */
require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('./models/User');
const Project  = require('./models/Project');
const Sanction = require('./models/Sanction');
const Material = require('./models/Material');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('  <i class="fa-solid fa-circle-check"></i>  Connected to MongoDB');

    /* ── Seed Users ────────────────────────────────────────── */
    const existingUsers = await User.countDocuments();
    if (existingUsers === 0) {
      await User.create([
        {
          email:     'admin@corekonstruct.com',
          password:  'admin123',
          name:      'Rajesh Kumar',
          role:      'admin',
          roleLabel: 'Contractor / Admin',
          initials:  'RK'
        },
        {
          email:     'supervisor@corekonstruct.com',
          password:  'super123',
          name:      'Arjun Singh',
          role:      'supervisor',
          roleLabel: 'Site Supervisor',
          initials:  'AS'
        },
        {
          email:     'client@corekonstruct.com',
          password:  'client123',
          name:      'Priya Mehta',
          role:      'client',
          roleLabel: 'Client',
          initials:  'PM'
        }
      ]);
      console.log('  👤  3 demo users seeded');
    } else {
      console.log(`  👤  Users already exist (${existingUsers}), skipping...`);
    }

    /* ── Seed Projects ─────────────────────────────────────── */
    const existingProjects = await Project.countDocuments();
    if (existingProjects === 0) {
      await Project.create([
        {
          name:       'City Center Complex',
          type:       'Building',
          location:   'Mumbai, MH',
          supervisor: 'Arjun Singh',
          budget:     4200000,
          spent:      2870000,
          labour:     980000,
          material:   1600000,
          misc:       290000,
          progress:   68,
          status:     'on-track',
          startDate:  '2025-03-01',
          endDate:    '2026-06-30',
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
          name:       'NH-48 Road Expansion',
          type:       'Road',
          location:   'Pune – Nashik Highway',
          supervisor: 'Arjun Singh',
          budget:     7500000,
          spent:      3100000,
          labour:     1200000,
          material:   1700000,
          misc:       200000,
          progress:   41,
          status:     'on-track',
          startDate:  '2025-06-01',
          endDate:    '2026-12-31',
          stages: [
            { name: 'Survey',      pct: 100, status: 'done' },
            { name: 'Earthwork',   pct: 100, status: 'done' },
            { name: 'Sub-base',    pct: 60,  status: 'active' },
            { name: 'Base Course', pct: 10,  status: 'pending' },
            { name: 'Surfacing',   pct: 0,   status: 'pending' }
          ],
          image: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?q=80&w=600'
        },
        {
          name:       'Residency Park Bridge',
          type:       'Bridge',
          location:   'Thane, MH',
          supervisor: 'Arjun Singh',
          budget:     9800000,
          spent:      8200000,
          labour:     3100000,
          material:   4500000,
          misc:       600000,
          progress:   84,
          status:     'delayed',
          startDate:  '2024-09-01',
          endDate:    '2026-03-31',
          stages: [
            { name: 'Piling',    pct: 100, status: 'done' },
            { name: 'Abutments', pct: 100, status: 'done' },
            { name: 'Deck Slab', pct: 100, status: 'done' },
            { name: 'Railings',  pct: 80,  status: 'active' },
            { name: 'Finishing', pct: 30,  status: 'pending' }
          ],
          image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=600'
        }
      ]);
      console.log('  <i class="fa-solid fa-clipboard-list"></i>  3 demo projects seeded');
    } else {
      console.log(`  <i class="fa-solid fa-clipboard-list"></i>  Projects already exist (${existingProjects}), skipping...`);
    }

    /* ── Seed Sanction Documents ────────────────────────────── */
    const existingSanctions = await Sanction.countDocuments();
    if (existingSanctions === 0) {
      await Sanction.create([
        { name: 'Environmental Clearance', project: 'City Center Complex', authority: 'MOEFCC',         date: '2024-01-15', expiry: '2029-01-14', status: 'approved' },
        { name: 'Building Plan Approval',  project: 'City Center Complex', authority: 'Municipal Corp', date: '2024-02-10', expiry: '2027-02-09', status: 'approved' },
        { name: 'Fire Safety NOC',          project: 'City Center Complex', authority: 'Fire Department',date: '2024-03-05', expiry: '2025-03-04', status: 'expiring' },
        { name: 'Highway Expansion NOC',    project: 'NH-48 Road Expansion',authority: 'NHAI',           date: '2023-05-20', expiry: '2026-05-19', status: 'approved' },
        { name: 'Tree Felling Permit',      project: 'NH-48 Road Expansion',authority: 'Forest Dept',    date: '2023-06-15', expiry: '2024-06-14', status: 'approved' },
        { name: 'Irrigation Dept Clearance',project: 'Residency Park Bridge',authority:'Irrigation Dept', date: '',           expiry: '',           status: 'pending'  }
      ]);
      console.log('  <i class="fa-solid fa-scroll"></i>  6 sanction documents seeded');
    } else {
      console.log(`  <i class="fa-solid fa-scroll"></i>  Sanctions already exist (${existingSanctions}), skipping...`);
    }

    /* ── Seed Materials ─────────────────────────────────────── */
    const existingMaterials = await Material.countDocuments();
    if (existingMaterials === 0) {
      const cityProject = await Project.findOne({ name: 'City Center Complex' });
      if (cityProject) {
        await Material.create([
          { item: 'Cement (OPC 53)',  qty: 120, unit: 'bags',  date: new Date().toISOString().split('T')[0], project: cityProject._id },
          { item: 'Sand (River)',     qty: 8,   unit: 'cu.m',  date: new Date().toISOString().split('T')[0], project: cityProject._id },
          { item: 'Steel (TMT 12mm)',qty: 2.5, unit: 'MT',    date: new Date().toISOString().split('T')[0], project: cityProject._id }
        ]);
        console.log('  <i class="fa-solid fa-trowel-bricks"></i>  3 material entries seeded');
      }
    } else {
      console.log(`  <i class="fa-solid fa-trowel-bricks"></i>  Materials already exist (${existingMaterials}), skipping...`);
    }

    console.log('\n  <i class="fa-solid fa-circle-check"></i>  Seed complete!\n');
    process.exit(0);
  } catch (err) {
    console.error('  <i class="fa-solid fa-circle-xmark"></i>  Seed error:', err.message);
    process.exit(1);
  }
}

seed();
