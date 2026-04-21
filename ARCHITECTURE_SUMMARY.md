# Core Konstruct — Architecture Overview (At a Glance)

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VERCEL (Next.js 14)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Next.js App Router (Front + API)               │   │
│  │                                                              │   │
│  │  /auth              /dashboard                              │   │
│  │  ├─ login          ├─ admin/        (Admin Dashboard)       │   │
│  │  └─ register       ├─ supervisor/   (Supervisor Dashboard)  │   │
│  │                    └─ client/       (Client Dashboard)      │   │
│  │                                                              │   │
│  │  /api                                                        │   │
│  │  ├─ auth/        (Supabase Auth flows)                       │   │
│  │  ├─ projects/    (CRUD + Progress logic)                     │   │
│  │  ├─ attendance/  (Mark presence)                             │   │
│  │  ├─ materials/   (Log consumed items)                        │   │
│  │  ├─ measurements/ (Record project metrics)                   │   │
│  │  ├─ daily-reports/ (Submit site work summaries)             │   │
│  │  └─ upload/      (Photo storage)                             │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                             ↓ (HTTP/WebSocket)                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │        Middleware: Auth Check + Role Validation             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
                                   ↓
         ┌─────────────────────────────────────────────────────┐
         │         SUPABASE (Backend + Database)               │
         ├─────────────────────────────────────────────────────┤
         │                                                      │
         │  ┌─ Supabase Auth (JWT + Session)                   │
         │  │   └─ auto-generated auth.uid() for RLS           │
         │  │                                                   │
         │  ├─ PostgreSQL (Data Layer)                          │
         │  │   ├─ users (profile metadata)                     │
         │  │   ├─ projects (name, type, location, budget...)   │
         │  │   ├─ project_stages (stage progression)          │
         │  │   ├─ workers (supervisor's team)                 │
         │  │   ├─ attendance (daily records)                   │
         │  │   ├─ materials (items logged)                     │
         │  │   ├─ measurements (project metrics)               │
         │  │   ├─ daily_reports (work summaries)              │
         │  │   ├─ daily_report_photos (images)                │
         │  │   └─ completed_projects (portfolio)              │
         │  │                                                   │
         │  ├─ Row-Level Security (RLS)                         │
         │  │   ├─ Admin: can read all, update all             │
         │  │   ├─ Supervisor: can read assigned, manage data  │
         │  │   └─ Client: can read own projects (limited cols)│
         │  │                                                   │
         │  └─ Supabase Storage (Files)                         │
         │      ├─ /project_images (public)                     │
         │      └─ /daily_reports (RLS protected)               │
         │                                                      │
         └──────────────────────────────────────────────────────┘
```

---

## Data Flow Examples

### Example 1: Supervisor Submits Attendance

```
1. Supervisor adds worker "Rajesh" on App
   → LocalState: workers.push({id: 1, name: "Rajesh"})

2. Supervisor marks him "Present"
   → LocalState: attendance[1] = 'present'

3. Supervisor clicks "Save Attendance"
   → POST /api/attendance
   → Payload: {
       project_id: "uuid-123",
       date: "2025-04-20",
       workers: [{id: 1, name: "Rajesh", present: true}]
     }

4. Next.js API Route Validation:
   → Check auth token (Supabase Auth)
   → Extract supervisor_id from token
   → Insert into Supabase attendance table
   → RLS enforces: supervisor_id matches token

5. Toast Notification: "Attendance saved ✓"

6. Admin Dashboard sees update (real-time via Realtime subscription)
```

### Example 2: Client Views Project Progress

```
1. Client logs in via Supabase Auth
   → JWT token stored in httpOnly cookie

2. Client visits /dashboard/client/projects
   → Middleware checks auth
   → Passes to page.tsx

3. page.tsx calls: GET /api/projects
   → API extracts client_id from Supabase session
   → Query: SELECT * FROM projects WHERE client_id = auth.uid()
   → RLS policy enforces this query
   → Returns ONLY: [id, name, progress, status, current_stage, image]
   → OMITS: [budget, spent, labour_cost, material_cost, misc_cost]

4. Client sees:
   ✅ Project name, progress bar, current stage
   ✅ Site photos from daily reports
   ❌ Never sees budget or costs

5. Supervisor submits daily report
   → daily_report_photos stored in Storage
   → Client views /dashboard/client/gallery
   → Queries daily_report_photos with project filter
   → RLS allows read if project.client_id = auth.uid()
```

### Example 3: Supervisor Updates Progress

```
1. Supervisor on /supervisor/progress
   → Selects project "City Center Complex"
   → Drags slider to 85%

2. Clicks "Update Progress"
   → PUT /api/projects/uuid-123/progress
   → Payload: { progress: 85, stageIndex: 2, note: "Brickwork advancing" }

3. Next.js API Route Logic:
   → Check auth (supervisor_id = token.sub)
   → Fetch project.stages[2] (Brickwork)
   → Set stages[2].pct = 85
   → If progress >= 100:
      - Set stages[2].status = 'done'
      - Find next pending stage
      - Set stages[3].status = 'active' (Plastering)
   → Save to Supabase projects table
   → Broadcast via Realtime

4. Admin Dashboard Updates (Realtime):
   → Ring chart animates from 68% → 70% (recalculated avg)
   → Project card shows updated progress
   → Stage tracker shows Brickwork complete

5. Client Dashboard Updates (Realtime):
   → Progress bar animates to new %
   → Timeline shows Brickwork ✓
```

---

## Role-Based Data Visibility

### Admin View
```
SELECT 
  p.id, p.name, p.type, p.location,
  p.supervisor, p.client,
  p.budget, p.spent,           ← Visible
  p.labour_cost, p.material_cost, p.misc_cost,  ← Visible
  p.progress, p.status,
  p.start_date, p.end_date,
  (SELECT array_agg(...) FROM project_stages WHERE project_id = p.id) as stages
FROM projects p
WHERE TRUE  ← No filter, sees all
```

### Supervisor View
```
SELECT *
FROM projects p
WHERE p.supervisor_id = auth.uid()  ← Own projects only
  AND p.status != 'completed'       ← Active projects

SELECT * FROM attendance WHERE supervisor_id = auth.uid()
SELECT * FROM materials WHERE supervisor_id = auth.uid()
SELECT * FROM daily_reports WHERE supervisor_id = auth.uid()
```

### Client View
```
SELECT 
  p.id, p.name, p.type, p.location,
  p.progress, p.status,
  p.start_date, p.end_date,
  p.image,
  (SELECT array_agg(...) FROM project_stages WHERE project_id = p.id) as stages
FROM projects p
WHERE p.client_id = auth.uid()  ← Own projects only

← OMITTED: budget, spent, labour_cost, material_cost, misc_cost

SELECT * FROM daily_report_photos prp
WHERE EXISTS (
  SELECT 1 FROM daily_reports dr
  WHERE dr.id = prp.report_id
    AND dr.project_id IN (
      SELECT id FROM projects WHERE client_id = auth.uid()
    )
)
```

---

## Component Hierarchy

### Admin Dashboard
```
AdminPage
├─ DashboardStats
│  ├─ StatCard (Total Projects)
│  ├─ ProjectProgressRing (Animated SVG)
│  └─ StatCard (Delayed)
├─ ProjectsList
│  ├─ ProjectOverviewCard (per project)
│  │  ├─ Image
│  │  ├─ Meta (Name, Location, Supervisor)
│  │  ├─ ProgressBar
│  │  └─ StatusBadge
│  └─ ProjectDetailModal
│     ├─ StageTracker (6 stages)
│     ├─ BudgetBreakdownBar
│     ├─ FinanceVisualization
│     └─ ProjectProgressRing
└─ Sidebar
   ├─ NavItem (Overview) [active]
   ├─ NavItem (Projects)
   └─ LogoutBtn
```

### Supervisor Dashboard
```
SupervisorPage
├─ Sidebar
│  ├─ ProjectSelector (Dropdown)
│  ├─ NavItem (Daily Report)
│  ├─ NavItem (Attendance)
│  ├─ NavItem (Materials)
│  ├─ NavItem (Measurements)
│  ├─ NavItem (Photos)
│  └─ NavItem (Progress)
└─ TaskTabs
   ├─ AttendanceTab
   │  ├─ AddWorkerForm
   │  ├─ AttendanceGrid (Worker toggles)
   │  ├─ AttendanceSummary
   │  └─ SaveBtn
   ├─ MaterialsTab
   │  ├─ MaterialEntryForm
   │  └─ MaterialsList (Table)
   ├─ MeasurementsTab
   │  ├─ MeasurementForm (Dynamic fields)
   │  └─ MeasurementHistory
   ├─ DailyReportTab
   │  ├─ DailyReportForm
   │  ├─ PhotoUploadWidget
   │  └─ SubmitBtn
   ├─ ProgressTab
   │  ├─ ProgressSlider
   │  └─ UpdateBtn
   └─ PhotosTab
      └─ PhotoGallery
```

### Client Dashboard
```
ClientPage
├─ Sidebar
│  ├─ NavItem (Ongoing Projects) [active]
│  ├─ NavItem (Project Details)
│  ├─ NavItem (Completed Works)
│  ├─ NavItem (Gallery)
│  └─ LogoutBtn
└─ MainContent
   ├─ OngoingProjectsTab
   │  └─ ProjectCardGrid (per project)
   │     ├─ CoverImage + StageOverlay
   │     ├─ ProgressBar
   │     └─ QuickSizeBtn → QuickProjectModal
   ├─ ProjectDetailTab
   │  ├─ ProjectDetailView
   │  │  ├─ CoverImage
   │  │  ├─ Metadata
   │  │  ├─ ProgressBar (Animated)
   │  │  ├─ TimelineStages
   │  │  └─ PhotoGrid
   ├─ CompletedTab
   │  └─ CompletedProjectCardGrid
   │     └─ CompletedProjectCard (per completed)
   └─ GalleryTab
      └─ GalleryGrid (Photos from daily reports)
```

---

## Database Query Examples

### Get Project with Stages (Admin)
```sql
SELECT 
  p.*,
  json_agg(
    json_build_object(
      'id', ps.id,
      'name', ps.stage_name,
      'pct', ps.percentage,
      'status', ps.status
    ) ORDER BY ps.order_index
  ) as stages
FROM projects p
LEFT JOIN project_stages ps ON p.id = ps.project_id
WHERE p.id = $1
GROUP BY p.id;
```

### Get Supervisor's Projects (Supervisor)
```sql
SELECT 
  p.id, p.name, p.type, p.location, p.progress, p.status
FROM projects p
WHERE p.supervisor_id = auth.uid()
ORDER BY p.start_date DESC;
```

### Get Attendance for Project (Admin/Supervisor)
```sql
SELECT 
  a.*,
  json_agg(
    json_build_object(
      'worker_id', w.id,
      'name', w.name,
      'present', (a.workers->>'present')::boolean
    )
  ) as workers_detail
FROM attendance a
LEFT JOIN workers w ON a.project_id = w.project_id
WHERE a.project_id = $1
ORDER BY a.attendance_date DESC;
```

### Get Daily Report Photos for Client
```sql
SELECT drp.* 
FROM daily_report_photos drp
JOIN daily_reports dr ON drp.report_id = dr.id
JOIN projects p ON dr.project_id = p.id
WHERE p.client_id = auth.uid()
  AND dr.project_id = $1  -- Filter by project
ORDER BY drp.created_at DESC;
```

---

## Deployment Checklist (Vercel)

- [ ] Environment Variables:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
  SUPABASE_SERVICE_ROLE_KEY=xxxxx (for server-side operations)
  ```
- [ ] Build Command: `next build`
- [ ] Start Command: `next start`
- [ ] Root Directory: `./`
- [ ] Install Command: `npm ci`

---

## Key Files to Create/Modify

| Priority | File | Scope |
|----------|------|-------|
| P0 | `src/middleware.ts` | Route protection |
| P0 | `lib/supabase/client.ts` | Browser client |
| P0 | `lib/supabase/types.ts` | TypeScript definitions |
| P0 | `src/app/(auth)/login/page.tsx` | Auth flow |
| P0 | `src/app/(dashboard)/layout.tsx` | DashboardLayout + Sidebar |
| P0 | `src/app/(dashboard)/admin/page.tsx` | Admin overview |
| P0 | `src/app/(dashboard)/supervisor/page.tsx` | Supervisor tasks |
| P0 | `src/app/(dashboard)/client/page.tsx` | Client projects |
| P0 | `src/api/projects/route.ts` | Main project API |
| P1 | `src/components/admin/ProjectOverviewCard.tsx` | Admin grid item |
| P1 | `src/components/supervisor/AttendanceGrid.tsx` | Attendance toggle |
| P1 | `src/components/client/OngoingProjectCard.tsx` | Client card |
| P2 | Real-time subscriptions | Optional (Supabase Realtime) |

---

## Testing Strategy

| Level | Tool | Focus |
|-------|------|-------|
| Unit | Jest + React Testing Library | Components, utils |
| Integration | Supabase emulator | Database + RLS |
| E2E | Playwright | Auth flow, data entry, client view |
| Security | Manual + OWASP | XSS, CSRF, RLS enforcement |

---

## Estimated Effort

| Phase | Duration | Team Size |
|-------|----------|-----------|
| Phase 1 (Auth) | 1 week | 1-2 developers |
| Phase 2 (Admin) | 1 week | 1-2 developers |
| Phase 3 (Supervisor) | 2 weeks | 2 developers (parallel components) |
| Phase 4 (Client) | 1 week | 1 developer |
| Phase 5 (Polish) | 1 week | 1-2 developers |
| **Total** | **6 weeks** | **Avg 1.5 devs** |

---

**Status:** Ready for implementation. All documentation complete. Proceed to Phase 1.

