# Current vs. Target Architecture Comparison

## Overview Table

| Aspect | Current (Express + MongoDB) | Target (Next.js + Supabase) | Migration Notes |
|--------|------------------------------|------------------------------|------------------|
| **Frontend** | Vanilla HTML/CSS/JS | Next.js 14 + TypeScript + Tailwind | Component-driven, type-safe |
| **Backend** | Express.js REST API | Next.js API Routes | Built-in backend |
| **Database** | MongoDB | PostgreSQL (Supabase) | Schema migration required |
| **Auth** | Custom JWT (sessionStorage) | Supabase Auth | Managed auth, automatic tokens |
| **Session** | sessionStorage | Supabase session object | HTTP-only cookies |
| **File Storage** | Local /uploads folder | Supabase Storage | Cloud-hosted, scalable |
| **Real-Time** | WebSocket (Socket.io) | Supabase Realtime (optional) | Pub/Sub ready |
| **Security** | Custom middleware | Middleware + RLS policies | Stronger isolation |
| **Deployment** | Node server (Render/Railway) | Vercel (serverless) | Faster, less maintenance |

---

## Feature Parity Matrix

### Admin Dashboard

| Feature | Current | Target | Priority |
|---------|---------|--------|----------|
| View all projects | ✅ | ✅ | P0 |
| Project overview card | ✅ | ✅ | P0 |
| Progress % display | ✅ | ✅ | P0 |
| Stage tracker (6 stages) | ✅ | ✅ | P0 |
| Budget breakdown | ✅ | ✅ | P0 |
| Circular progress ring | ✅ | ✅ | P1 |
| Project detail modal | ✅ | ✅ | P0 |
| Real-time updates | ⚠️ (WebSocket) | ✅ (Realtime) | P1 |
| Export/Reports | ❌ | ❌ | Future |

### Supervisor Dashboard

| Feature | Current | Target | Priority |
|---------|---------|--------|----------|
| View assigned projects | ✅ | ✅ | P0 |
| Add/remove workers | ✅ | ✅ | P0 |
| Mark attendance | ✅ | ✅ | P0 |
| Attendance summary | ✅ | ✅ | P0 |
| Save attendance to API | ✅ | ✅ | P0 |
| Add materials | ✅ | ✅ | P0 |
| Material history | ✅ | ✅ | P0 |
| Enter measurements | ✅ | ✅ | P0 |
| Measurement history | ✅ | ✅ | P0 |
| Daily report form | ✅ | ✅ | P0 |
| Photo upload (multi) | ✅ | ✅ | P0 |
| Expense logging | ✅ | ✅ | P0 |
| Update progress | ✅ | ✅ | P0 |
| Offline fallback | ✅ (localStorage) | ⚠️ (optional) | P2 |

### Client Dashboard

| Feature | Current | Target | Priority |
|---------|---------|--------|----------|
| View own projects | ✅ | ✅ | P0 |
| Project cards (grid) | ✅ | ✅ | P0 |
| Progress bar | ✅ | ✅ | P0 |
| Project detail view | ✅ | ✅ | P0 |
| Timeline/milestones | ✅ | ✅ | P0 |
| Site gallery | ✅ | ✅ | P0 |
| Completed projects | ✅ | ✅ | P0 |
| Quick modal | ✅ | ✅ | P1 |
| Real-time updates | ⚠️ (manual refresh) | ✅ (automatic) | P1 |
| **NO financial data** | ✅ | ✅ | P0 (critical) |
| Currency converter | ✅ | ✅ | P2 |

---

## Data Model Transformation

### Users
```
MongoDB User.js
├── name: String
├── email: String
├── password: String (hashed)
├── role: 'admin' | 'supervisor' | 'client'
└── roleLabel: String

↓ BECOMES ↓

Supabase Auth + users table
├── id: UUID (from auth.uid())
├── email: String
├── name: String
├── role: 'admin' | 'supervisor' | 'client'
└── role_label: String
```

### Projects
```
MongoDB Project.js
├── name
├── type: 'Building' | 'Road' | 'Bridge'
├── location
├── supervisor
├── client
├── budget
├── spent, labour, material, misc
├── progress: 0-100
├── status: 'on-track' | 'on-hold' | 'delayed' | 'completed'
├── startDate, endDate
├── stages: [{name, pct, status}]
└── image

↓ BECOMES ↓

Supabase projects table
├── id: UUID
├── name
├── type
├── location
├── supervisor_id: UUID (foreign key)
├── client_id: UUID (foreign key)
├── budget, spent, labour_cost, material_cost, misc_cost
├── progress
├── status
├── start_date, end_date
├── image_url, description
└── timestamps (created_at, updated_at)

+ Separate project_stages table
  ├── id: UUID
  ├── project_id: UUID
  ├── stage_name
  ├── percentage
  ├── status: 'pending' | 'active' | 'done'
  └── order_index
```

### Attendance
```
MongoDB Attendance.js
├── date
├── project
├── workers: [{id, name, present}]
└── submittedBy

↓ BECOMES ↓

Supabase attendance table
├── id: UUID
├── project_id: UUID
├── supervisor_id: UUID
├── attendance_date
├── workers: JSONB array
├── present_count
├── absent_count
└── timestamps
```

### Daily Reports
```
MongoDB DailyReport.js
├── project
├── date
├── weather
├── stage
├── workDone
├── issues
├── photos: []
├── expenses: {labour, material, misc, description}
└── submittedBy

↓ BECOMES ↓

Supabase daily_reports table
├── id: UUID
├── project_id: UUID
├── supervisor_id: UUID
├── report_date
├── weather
├── current_stage
├── work_done
├── issues
├── labour_expense, material_expense, misc_expense
├── expense_description
├── status: 'draft' | 'submitted' | 'approved'
└── timestamps

+ daily_report_photos table (one-to-many)
  ├── id: UUID
  ├── report_id: UUID
  ├── photo_url (reference to Storage)
  ├── photo_order
  ├── caption
  └── created_at
```

---

## API Route Mapping

### Current Express Routes → Next.js API Routes

| Current Endpoint | Target Endpoint | Component |
|------------------|-----------------|-----------|
| `POST /api/auth/register` | `POST /api/auth/register` | Auth |
| `POST /api/auth/login` | `POST /api/auth/login` | Auth |
| `GET /api/auth/me` | Handled by Supabase session | Auth |
| `GET /api/projects` | `GET /api/projects` | Admin/Supervisor/Client |
| `GET /api/projects/:id` | `GET /api/projects/[id]` | Admin detail modal |
| `PUT /api/projects/:id` | `PUT /api/projects/[id]` | Admin (future) |
| `PUT /api/projects/:id/progress` | `PUT /api/projects/[id]/progress` | Supervisor progress |
| `POST /api/attendance` | `POST /api/attendance` | Supervisor |
| `GET /api/attendance` | `GET /api/attendance` | Supervisor |
| `POST /api/materials` | `POST /api/materials` | Supervisor |
| `GET /api/materials` | `GET /api/materials` | Supervisor |
| `DELETE /api/materials/:id` | `DELETE /api/materials/[id]` | Supervisor |
| `POST /api/measurements` | `POST /api/measurements` | Supervisor |
| `GET /api/measurements` | `GET /api/measurements` | Supervisor |
| `POST /api/reports` | `POST /api/daily-reports` | Supervisor |
| `GET /api/reports` | `GET /api/daily-reports` | Supervisor/Admin/Client |
| `POST /api/upload` | `POST /api/upload/daily-report-photo` | Supervisor |
| `GET /api/completed-projects` | `GET /api/completed-projects` | Client |

---

## Security Improvements

### Current State
- ❌ JWT token in sessionStorage (XSS vulnerable)
- ❌ No row-level security (API must filter manually)
- ❌ Files stored locally (scalability issue)
- ❌ Auth checks only on server (client can manipulate)

### Target State
- ✅ Supabase Auth handles tokens (HTTP-only cookies)
- ✅ PostgreSQL RLS enforces data isolation
- ✅ Supabase Storage with policy-based access
- ✅ Middleware + RLS provide defense-in-depth
- ✅ No manual auth checks needed

### RLS Examples

**Admin can see all projects:**
```sql
SELECT * FROM projects 
WHERE role = 'admin';
```

**Supervisor sees only assigned projects:**
```sql
SELECT * FROM projects 
WHERE supervisor_id = auth.uid();
```

**Client sees only own projects:**
```sql
SELECT * FROM projects 
WHERE client_id = auth.uid();
```

**Client cannot access financial columns:**
```sql
SELECT id, name, progress, status, current_stage
FROM projects 
WHERE client_id = auth.uid();
-- labour_cost, material_cost, etc. NOT returned
```

---

## Performance Improvements

| Metric | Current | Target | Benefit |
|--------|---------|--------|---------|
| TTF (Time to First Byte) | ~500ms | ~100ms | Serverless edge functions |
| TTFB (to Fully Built) | ~2s | ~0.5s | Pre-built Next.js optimization |
| Real-time sync | Polling or WebSocket | Pub/Sub ready | Instant updates |
| Image load | Express static | Vercel CDN + next/image | 70% reduction |
| Database queries | Express middleware | Edge-near Supabase | Network latency reduced |

---

## Migration Path (Timeline)

### Week 1: Setup
- Create Supabase project
- Initialize Next.js
- Migrate auth
- Deploy test instance

### Week 2-3: Admin & Core Data
- Build admin dashboard
- Migrate projects
- Test data flow

### Week 3-4: Supervisor Features
- Build attendance/materials/measurements
- Build daily report form
- Test data entry

### Week 4-5: Client Dashboard
- Build read-only views
- Verify RLS blocks financial data
- Test seamless updates

### Week 5-6: Polish & Deploy
- E2E testing
- Performance optimization
- Production deployment

---

## Rollback Plan

If issues arise:
1. Keep current Express API running parallel for 2 weeks
2. Route traffic: 10% → Next.js, 90% → Express (traffic split)
3. Monitor errors, gradually increase Next.js %
4. If critical: Switch back to 100% Express, debug, re-release

---

## Key Differences Users Will Notice

### Admin
- ✅ Smoother UI (no page reloads)
- ✅ Real-time progress updates
- ❌ No new data-entry features

### Supervisor
- ✅ Same features, faster load
- ✅ Better form validation
- ✅ Improved photo upload
- ❌ No new data-entry forms

### Client
- ✅ Real-time project updates (no manual refresh)
- ✅ Faster page loads
- ✅ Better mobile experience (Tailwind responsive)
- ❌ No new visibility (financial data still hidden)

---

## FAQ

**Q: Can I keep using Express + MongoDB?**  
A: Yes, but you'll miss out on:
- Supabase Auth (industry-standard, easier to maintain)
- PostgreSQL RLS (stronger security)
- Vercel deployment (faster, less ops overhead)
- Real-time capabilities (built-in)

**Q: Will there be downtime during migration?**  
A: No. We'll run both systems in parallel, then cut over after thorough testing.

**Q: Do I need to rewrite all my JavaScript?**  
A: Not all. We're reusing:
- Business logic (stage progression, expense calc)
- UI concepts (card layouts, modals, forms)
- Data structure (projects, stages, workers)
- Only converting to React/TypeScript and PostgreSQL

**Q: What about user data already in MongoDB?**  
A: We'll export and import to PostgreSQL during Week 1. Existing logins will continue with Supabase Auth.

