# Core Konstruct → Next.js + Supabase Architecture Plan

**Prepared by:** Principal SaaS Architect  
**Current Stack:** Node.js + Express + MongoDB  
**Target Stack:** Next.js (App Router) + Tailwind CSS + Supabase (PostgreSQL + Auth + RLS)

---

## 1. VISUAL & FUNCTIONAL BREAKDOWN (By Role)

### 1.1 ADMIN DASHBOARD

**Primary Function:** High-level project oversight, financial tracking, and contractor management.

#### Visible Data Points:
- **Project Overview Cards (List View)**
  - Project name, type, location, assigned supervisor
  - Real-time progress bar (0-100%)
  - Budget vs. Spent breakdown
  - Status badge (On Track / Delayed)
  - Project image thumbnail

- **Main Dashboard Stats (Hero Section)**
  - Total Projects count
  - Average Progress % (animated ring chart)
  - Delayed Projects count
  - Overall portfolio snapshot

- **Project Detail Modal**
  - Full project information
  - Budget breakdown (Labour / Material / Misc)
  - Stage tracker (6 stages: Foundation → Structure → Brickwork → Plastering → Finishing → Handover)
  - Financial visualization bars
  - Spent vs. Budget circular progress

- **Financial Analytics**
  - Per-project cost breakdown (₹ currency)
  - Labour costs (by project)
  - Material costs (by project)
  - Miscellaneous expenses
  - Budget utilization percentage

#### Admin Actions:
- View all projects across supervisors
- Click into project details
- Monitor stage completion (calculated from supervisor submissions)
- Receive real-time updates via WebSocket when supervisor marks progress
- See project images and descriptions

---

### 1.2 SUPERVISOR DASHBOARD

**Primary Function:** Daily site operations, data entry, progress updates, worker management.

#### Visible Data Points:

- **My Projects (Dropdown/List)**
  - Assigned projects only
  - Name, type, location
  - Current stage and progress %

- **Attendance Section**
  - Worker roster (dynamically managed)
  - Toggle presence status (Present/Absent)
  - Display with initials avatars
  - Summary counters (Present count, Absent count, Total)
  - Real-time status updates

- **Materials Entry Form**
  - Item name, quantity, unit
  - Automatic date assignment
  - Material history table
  - Delete capability

- **Measurements Section**
  - Dynamic form fields based on project type:
    - **Building:** Floor Slab Area (m²), Column Height (m), Wall Length (m)
    - **Road:** Length Completed (m), Width (m), Layer Thickness (mm)
    - **Bridge:** Span Completed (m), Deck Thickness (mm), No. of Piles Done
    - **Drainage:** Pipe Length (m), Trench Depth (m), No. of Manholes
  - Historical measurements display
  - Notes field for context

- **Daily Report Form**
  - Weather conditions
  - Current stage name
  - Work Done description
  - Issues/blockers description
  - Photo upload (multiple images)
  - Expense logging (Labour / Material / Misc breakdown)

- **Site Photos Section**
  - Photo upload interface
  - Gallery display of uploaded images
  - Associated with daily reports

- **Progress Update Section**
  - Update project progress % via slider/input
  - Link to specific project stage
  - Trigger stage completion logic

#### Supervisor Actions:
- Add/remove workers dynamically
- Mark attendance (toggle per worker)
- Submit daily reports with photos
- Log materials consumed
- Record measurements (type-specific)
- Update project progress
- View all submissions with timestamps
- Edit/delete past entries (within same day, likely)

---

### 1.3 CLIENT DASHBOARD

**Primary Function:** View-only project transparency, progress tracking, portfolio showcase.

#### Visible Data Points:

- **Ongoing Projects (Card Grid)**
  - Project name, type, location
  - Current stage display
  - Progress bar (0-100%)
  - Project cover image
  - Est. completion date
  - Status badge (In Progress)
  - Quick Size button (opens modal)

- **Project Detail View (Seamless Updates)**
  - Cover image with stage overlay
  - Project metadata (Name, Type, Location, Stage)
  - Progress percentage and animated bar
  - Timeline of milestone stages (shows completed ✓, active %, pending)
  - Phase-wise breakdown
  - Est. start and end dates

- **Project Gallery**
  - All site photos from daily reports
  - Filtered by selected project
  - No financial data visible
  - Image count display

- **Completed Works**
  - Portfolio of finished projects
  - Completed year, location, type, description
  - Project images

- **Currency Converter Tool**
  - Utility for client reference (not tied to project data)

#### Client Actions:
- Browse own projects only (row-level security)
- View project details in real-time
- Open quick modal for project summary
- Browse site gallery
- View completed projects history
- **NO financial data visibility** (Budget, costs, etc.)
- **NO ability to edit** anything

---

## 2. DATABASE SCHEMA UPDATES (SUPABASE PostgreSQL)

### 2.1 Core Tables

#### `users` (Extended from Auth)
```sql
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'client')),
  role_label TEXT, -- "Contractor / Admin", "Site Supervisor", "Client"
  initials TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS: Users can read own profile, Admins can read all
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update users" ON public.users
  FOR UPDATE USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
```

#### `projects`
```sql
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Building', 'Road', 'Bridge', 'Drainage', 'Other')),
  location TEXT,
  supervisor_id UUID REFERENCES public.users(id),
  client_id UUID REFERENCES public.users(id),
  budget DECIMAL(15, 2) DEFAULT 0,
  spent DECIMAL(15, 2) DEFAULT 0,
  labour_cost DECIMAL(15, 2) DEFAULT 0,
  material_cost DECIMAL(15, 2) DEFAULT 0,
  misc_cost DECIMAL(15, 2) DEFAULT 0,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status TEXT DEFAULT 'on-track' CHECK (status IN ('on-track', 'on-hold', 'delayed', 'completed')),
  start_date DATE,
  end_date DATE,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS: Admins see all, Supervisors see assigned, Clients see own
CREATE POLICY "Admins see all projects" ON public.projects
  FOR SELECT USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Supervisors see assigned projects" ON public.projects
  FOR SELECT USING (supervisor_id = auth.uid() OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Clients see own projects" ON public.projects
  FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Only admins update projects" ON public.projects
  FOR UPDATE USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
```

#### `project_stages`
```sql
CREATE TABLE IF NOT EXISTS public.project_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  percentage INTEGER DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'done')),
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stages visible with project" ON public.project_stages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id 
    AND (p.supervisor_id = auth.uid() OR p.client_id = auth.uid() OR 
         (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
  ));

CREATE POLICY "Only admins/supervisors update stages" ON public.project_stages
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id 
    AND (p.supervisor_id = auth.uid() OR 
         (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
  ));
```

#### `workers` (Site Workforce)
```sql
CREATE TABLE IF NOT EXISTS public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  worker_type TEXT, -- 'Skilled', 'Semi-Skilled', 'Unskilled', 'Labor'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors manage own workers" ON public.workers
  FOR ALL USING (supervisor_id = auth.uid() OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
```

#### `attendance`
```sql
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES public.users(id),
  attendance_date DATE NOT NULL,
  workers JSONB NOT NULL, -- Array: [{worker_id, name, present: boolean}]
  present_count INTEGER,
  absent_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, supervisor_id, attendance_date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors submit own attendance" ON public.attendance
  FOR INSERT WITH CHECK (supervisor_id = auth.uid());

CREATE POLICY "Supervisors view own attendance" ON public.attendance
  FOR SELECT USING (supervisor_id = auth.uid() OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Supervisors update own attendance" ON public.attendance
  FOR UPDATE USING (supervisor_id = auth.uid());
```

#### `materials`
```sql
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES public.users(id),
  material_date DATE NOT NULL,
  item_name TEXT NOT NULL,
  quantity DECIMAL(12, 2) NOT NULL,
  unit TEXT NOT NULL, -- 'm', 'kg', 'L', 'pieces', etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors manage own materials" ON public.materials
  FOR ALL USING (supervisor_id = auth.uid() OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
```

#### `measurements`
```sql
CREATE TABLE IF NOT EXISTS public.measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES public.users(id),
  measurement_date DATE NOT NULL,
  project_type TEXT NOT NULL, -- 'Building', 'Road', 'Bridge', 'Drainage'
  measurement_data JSONB NOT NULL, -- Flexible: {meas-area: "450", meas-height: "3.5", ...}
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors manage own measurements" ON public.measurements
  FOR ALL USING (supervisor_id = auth.uid() OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
```

#### `daily_reports`
```sql
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES public.users(id),
  report_date DATE NOT NULL,
  weather TEXT,
  current_stage TEXT,
  work_done TEXT,
  issues TEXT,
  labour_expense DECIMAL(12, 2) DEFAULT 0,
  material_expense DECIMAL(12, 2) DEFAULT 0,
  misc_expense DECIMAL(12, 2) DEFAULT 0,
  expense_description TEXT,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'approved')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, supervisor_id, report_date)
);

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors manage own reports" ON public.daily_reports
  FOR ALL USING (supervisor_id = auth.uid() OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins and assigned supervisors read reports" ON public.daily_reports
  FOR SELECT USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' OR
    supervisor_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND client_id = auth.uid()));
```

#### `daily_report_photos`
```sql
CREATE TABLE IF NOT EXISTS public.daily_report_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_order INTEGER DEFAULT 0,
  caption TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.daily_report_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View photos with report access" ON public.daily_report_photos
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.daily_reports dr WHERE dr.id = report_id 
    AND (dr.supervisor_id = auth.uid() OR 
         (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' OR
         EXISTS (SELECT 1 FROM public.projects WHERE id = dr.project_id AND client_id = auth.uid()))
  ));
```

#### `completed_projects`
```sql
CREATE TABLE IF NOT EXISTS public.completed_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  project_type TEXT NOT NULL, -- 'Building', 'Road', 'Bridge', etc.
  location TEXT,
  completed_year INTEGER,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.completed_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view completed projects" ON public.completed_projects
  FOR SELECT USING (true);
```

---

### 2.2 Storage Buckets (Supabase Storage)

```sql
-- Create public bucket for project images
CREATE BUCKET IF NOT EXISTS public.project_images;

-- Create private bucket for daily report photos (with client access via RLS)
CREATE BUCKET IF NOT EXISTS public.daily_reports;
```

---

## 3. COMPONENT & ROUTING ARCHITECTURE (Next.js App Router)

### 3.1 Folder Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # DashboardLayout wrapper
│   │   │
│   │   ├── admin/
│   │   │   ├── page.tsx                  # AdminDashboard (overview)
│   │   │   ├── projects/page.tsx         # Admin projects list
│   │   │   ├── projects/[id]/page.tsx    # Admin project detail
│   │   │   └── layout.tsx
│   │   │
│   │   ├── supervisor/
│   │   │   ├── page.tsx                  # SupervisorDashboard
│   │   │   ├── projects/page.tsx         # My projects
│   │   │   ├── attendance/page.tsx       # Attendance management
│   │   │   ├── materials/page.tsx        # Materials entry
│   │   │   ├── measurements/page.tsx     # Measurements by type
│   │   │   ├── daily-report/page.tsx     # Daily report form
│   │   │   ├── photos/page.tsx           # Site photos
│   │   │   ├── progress/page.tsx         # Update progress
│   │   │   └── layout.tsx
│   │   │
│   │   └── client/
│   │       ├── page.tsx                  # ClientDashboard
│   │       ├── projects/page.tsx         # Ongoing projects
│   │       ├── projects/[id]/page.tsx    # Project detail
│   │       ├── gallery/page.tsx          # Project gallery
│   │       ├── completed/page.tsx        # Completed works
│   │       └── layout.tsx
│   │
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── register/route.ts
│       │   └── logout/route.ts
│       │
│       ├── projects/
│       │   ├── route.ts                  # GET /api/projects
│       │   └── [id]/route.ts             # GET/PUT /api/projects/[id]
│       │
│       ├── attendance/route.ts
│       ├── materials/route.ts
│       ├── measurements/route.ts
│       ├── daily-reports/route.ts
│       ├── workers/route.ts
│       ├── completed-projects/route.ts
│       │
│       └── upload/
│           ├── project-image/route.ts
│           └── daily-report-photo/route.ts
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   ├── DashboardLayout.tsx
│   │   └── NavItem.tsx
│   │
│   ├── admin/
│   │   ├── ProjectOverviewCard.tsx        # List item
│   │   ├── ProjectDetailModal.tsx        # Expanded view
│   │   ├── DashboardStats.tsx            # Hero stats
│   │   ├── ProjectProgressRing.tsx       # Circular chart
│   │   ├── StageTracker.tsx              # 6-stage timeline
│   │   ├── BudgetBreakdownBar.tsx        # Labour/Material/Misc
│   │   ├── FinanceVisualization.tsx      # Cost breakdown
│   │   └── ProjectsList.tsx
│   │
│   ├── supervisor/
│   │   ├── ProjectSelector.tsx           # Dropdown for "My Projects"
│   │   ├── AttendanceGrid.tsx            # Worker presence toggles
│   │   ├── AttendanceSummary.tsx         # Present/Absent/Total counts
│   │   ├── MaterialEntryForm.tsx         # Item + Qty + Unit form
│   │   ├── MaterialsList.tsx             # Table of entries
│   │   ├── MeasurementForm.tsx           # Dynamic by project type
│   │   ├── MeasurementHistory.tsx        # Previous measurements
│   │   ├── DailyReportForm.tsx           # Weather + Work + Issues
│   │   ├── PhotoUploadWidget.tsx         # Multi-image upload
│   │   ├── PhotoGallery.tsx              # Display uploaded
│   │   ├── ProgressSlider.tsx            # Update %
│   │   └── TaskTabs.tsx                  # Tab navigation
│   │
│   ├── client/
│   │   ├── OngoingProjectCard.tsx        # Grid card layout
│   │   ├── ProjectDetailView.tsx         # Seamless detail
│   │   ├── ProgressBar.tsx               # Animated bar
│   │   ├── TimelineStages.tsx            # Phase breakdown
│   │   ├── CompletedProjectCard.tsx      # Portfolio item
│   │   ├── GalleryGrid.tsx               # Photo grid
│   │   └── QuickProjectModal.tsx         # Quick summary
│   │
│   └── common/
│       ├── Badge.tsx                     # Status badges
│       ├── Toast.tsx                     # Notifications
│       ├── Modal.tsx                     # Generic modal
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Spinner.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                     # Supabase client (browser)
│   │   ├── server.ts                     # Supabase client (server)
│   │   └── types.ts                      # Type definitions
│   │
│   ├── api/
│   │   ├── projects.ts
│   │   ├── attendance.ts
│   │   ├── materials.ts
│   │   ├── measurements.ts
│   │   ├── dailyReports.ts
│   │   └── auth.ts
│   │
│   ├── auth/
│   │   └── authContext.tsx               # Client-side auth state
│   │
│   └── utils/
│       ├── validators.ts
│       ├── formatters.ts                 # Format currency, dates
│       └── constants.ts                  # MEASUREMENT_FIELDS, PROJECT_TYPES
│
├── styles/
│   ├── globals.css                       # Tailwind globals
│   ├── dashboard.css                     # Dashboard-specific
│   └── animations.css
│
└── middleware.ts                         # Route protection
```

### 3.2 Reusable Component Specs

#### Admin Components

**ProjectOverviewCard.tsx**
- Props: `project: Project`, `onClick: () => void`
- Displays: image, name, location, supervisor, progress bar, status badge
- Features: Hover effect, click to detail modal

**DashboardStats.tsx**
- Props: `projects: Project[]`
- Displays: Total projects, Average progress (with animated ring), Delayed count
- Features: Real-time calculations, SVG ring animation

**ProjectProgressRing.tsx**
- Props: `percentage: number`, `size: number`, `color: string`
- Features: SVG circular progress with dash animation

**StageTracker.tsx**
- Props: `stages: Stage[]`
- Displays: Linear stage progression (Pending → Active → Done)
- Features: Percentage display per stage

**BudgetBreakdownBar.tsx**
- Props: `labour: number`, `material: number`, `misc: number`
- Displays: Stacked horizontal bars with color coding

#### Supervisor Components

**AttendanceGrid.tsx**
- Props: `workers: Worker[]`, `onToggle: (workerId, status) => void`, `onRemove: (workerId) => void`
- Features: Avatar initials, toggle click, remove button

**AttendanceSummary.tsx**
- Props: `present: number`, `absent: number`, `total: number`
- Displays: Stat counters with icons

**MeasurementForm.tsx**
- Props: `projectType: string`, `onSubmit: (data) => void`
- Features: Dynamic fields based on project type (Building/Road/Bridge/Drainage)
- Fields: MEASUREMENT_FIELDS config-driven

**DailyReportForm.tsx**
- Props: `projectId: string`, `onSubmit: (report) => void`
- Fields: Weather, Stage, Work Done, Issues, Expenses (Labour/Material/Misc), Photos

**PhotoUploadWidget.tsx**
- Props: `onUpload: (files: File[]) => void`, `maxFiles: number`
- Features: Drag-and-drop, multi-select, preview

#### Client Components

**OngoingProjectCard.tsx**
- Props: `project: Project`, `onQuickSize: () => void`
- Features: Cover image, stage overlay, progress bar, "Quick Size" button

**ProjectDetailView.tsx**
- Props: `project: Project`, `isRealtimeUpdate: boolean`
- Features: Seamless real-time updates, timeline stages, photo count
- No financial data rendered

**TimelineStages.tsx**
- Props: `stages: Stage[]`, `currentStage: string`
- Features: Milestone display (✓ Done, 50% Active, Pending)

**CompletedProjectCard.tsx**
- Props: `project: CompletedProject`
- Features: Image, name, type, location, year, description

---

## 4. STEP-BY-STEP IMPLEMENTATION PLAN

### Phase 1: Infrastructure & Auth Setup (Week 1)

**Objective:** Establish Supabase foundation and migrate user authentication.

**Step 1.1:** Create Supabase Project
- [ ] Create PostgreSQL database
- [ ] Configure Row-Level Security policies
- [ ] Set up Supabase Auth (Email/Password)
- [ ] Create `users` table extending Auth schema
- [ ] Test auth endpoints

**Step 1.2:** Set Up Next.js Project
```bash
npx create-next-app@latest bhakti-nextjs --typescript --tailwind --app
cd bhakti-nextjs
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

**Step 1.3:** Create Auth Flow
- [ ] Migrate login.html → `src/app/(auth)/login/page.tsx`
- [ ] Migrate register.html → `src/app/(auth)/register/page.tsx`
- [ ] Create Supabase client utilities (`lib/supabase/client.ts`, `server.ts`)
- [ ] Implement AuthContext for client-side state (`lib/auth/authContext.tsx`)
- [ ] Create middleware for route protection (`src/middleware.ts`)

**Step 1.4:** Data Migration
- [ ] Export users from MongoDB
- [ ] Import to Supabase `users` table
- [ ] Verify auth flow with existing users

---

### Phase 2: Core Data Schema & Admin Dashboard (Week 2)

**Objective:** Build PostgreSQL schema and implement admin features.

**Step 2.1:** Create Database Tables
- [ ] Create `projects` table with all financial fields
- [ ] Create `project_stages` table
- [ ] Create `completed_projects` table
- [ ] Implement RLS policies
- [ ] Test data insertion

**Step 2.2:** Data Migration
- [ ] Export projects from MongoDB
- [ ] Transform to PostgreSQL format
- [ ] Import `projects`, `project_stages`, `completed_projects`

**Step 2.3:** Build Admin Dashboard
- [ ] Create `src/app/(dashboard)/layout.tsx` (DashboardLayout with Sidebar)
- [ ] Build Sidebar component with role-based nav
- [ ] Create `src/app/(dashboard)/admin/page.tsx` (overview)
- [ ] Implement DashboardStats component (projects count, avg progress, delays)
- [ ] Implement ProjectProgressRing (animated SVG)
- [ ] Build ProjectOverviewCard component (grid/list)
- [ ] Add project detail modal with stage tracker
- [ ] Connect to Supabase API routes (`src/api/projects/route.ts`)

**Step 2.4:** Real-Time Updates (Optional - Phase 2.5)
- [ ] Set up Supabase Realtime subscriptions
- [ ] Update admin dashboard on project changes

---

### Phase 3: Supervisor Features (Week 3-4)

**Objective:** Build data entry and tracking features.

**Step 3.1:** Create Supporting Tables
- [ ] Create `workers`, `attendance`, `materials`, `measurements`, `daily_reports`, `daily_report_photos` tables
- [ ] Implement RLS for each
- [ ] Test relationships

**Step 3.2:** Supervisor Dashboard Layout
- [ ] Create `src/app/(dashboard)/supervisor/page.tsx`
- [ ] Build TaskTabs component for navigation
- [ ] Create ProjectSelector component (dropdown for "My Projects")

**Step 3.3:** Implement Attendance Feature
- [ ] Create AttendanceGrid component
- [ ] Build attendance form with worker management
- [ ] Connect to `/api/attendance` route
- [ ] Test local storage + API sync flow

**Step 3.4:** Implement Materials Tracking
- [ ] Create MaterialEntryForm component
- [ ] Build MaterialsList table
- [ ] Connect to `/api/materials` route
- [ ] Test add/remove/filter functionality

**Step 3.5:** Implement Measurements
- [ ] Create MeasurementForm with MEASUREMENT_FIELDS config
- [ ] Build MeasurementHistory component
- [ ] Connect to `/api/measurements` route
- [ ] Test project-type dynamic fields

**Step 3.6:** Implement Daily Reports
- [ ] Create DailyReportForm with all fields
- [ ] Build PhotoUploadWidget
- [ ] Connect to `/api/daily-reports` and `/api/upload/daily-report-photo` routes
- [ ] Test multi-photo upload and storage

**Step 3.7:** Implement Progress Updates
- [ ] Create ProgressSlider component
- [ ] Build stage management logic
- [ ] Connect to `/api/projects/[id]/progress` route

---

### Phase 4: Client Dashboard (Week 4-5)

**Objective:** Build read-only client experience.

**Step 4.1:** Create Client Tables (RLS Only)
- [ ] Ensure `projects` RLS allows clients to see only `client_id = auth.uid()`
- [ ] Ensure `daily_reports` RLS allows client photo access
- [ ] Test policies

**Step 4.2:** Build Client Dashboard
- [ ] Create `src/app/(dashboard)/client/page.tsx`
- [ ] Build OngoingProjectCard component
- [ ] Create ProjectDetailView with seamless real-time updates
- [ ] Build TimelineStages component
- [ ] **Ensure NO financial data rendered**

**Step 4.3:** Implement Project Gallery
- [ ] Create `src/app/(dashboard)/client/gallery/page.tsx`
- [ ] Build GalleryGrid component
- [ ] Connect to daily_report_photos via project filter

**Step 4.4:** Implement Completed Works
- [ ] Create `src/app/(dashboard)/client/completed/page.tsx`
- [ ] Build CompletedProjectCard component
- [ ] Connect to `completed_projects` table

---

### Phase 5: Polish, Testing & Deployment (Week 5-6)

**Step 5.1:** API Route Completion
- [ ] Verify all `/api/*` routes are implemented
- [ ] Add proper error handling
- [ ] Test with real client/server architecture

**Step 5.2:** Error Handling & Validation
- [ ] Add Toast notifications for all operations
- [ ] Implement field validation
- [ ] Test edge cases (no projects, network failure, etc.)

**Step 5.3:** Performance & Optimization
- [ ] Implement Supabase query caching (SWR or React Query)
- [ ] Optimize images (next/image)
- [ ] Lazy-load modals and tabs
- [ ] Test lighthouse scores

**Step 5.4:** Security Audit
- [ ] Verify RLS policies block unauthorized access
- [ ] Test auth token expiration
- [ ] Check for XSS, CSRF vulnerabilities
- [ ] Validate file upload restrictions

**Step 5.5:** Testing
- [ ] Unit tests for components (Jest + React Testing Library)
- [ ] E2E tests for auth flow (Playwright)
- [ ] E2E tests for supervisor data entry
- [ ] E2E tests for client read-only access

**Step 5.6:** Deployment
- [ ] Set up Vercel project
- [ ] Configure environment variables (SUPABASE_URL, ANON_KEY, etc.)
- [ ] Deploy to production
- [ ] Monitor for errors

---

## 5. KEY MIGRATION NOTES

### Auth Continuity
- Current system uses JWT stored in `sessionStorage`
- Supabase Auth handles token management automatically
- Middleware protects routes on the server
- Client-side auth context syncs with Supabase session

### Data Integrity
- **No financial data exposed to clients** via RLS (critical)
- Attendance and materials tied to supervisor only
- Stage updates propagate to admin dashboard via Realtime

### Offline Support (Optional)
- Current code uses localStorage fallback for projects
- Next.js version can use SWR or React Query with local cache

### Real-Time Features (Optional - Phase 2.5)
- Supabase Realtime broadcasts updates when:
  - Supervisor submits daily report
  - Supervisor updates progress
  - Stage completes (auto-activate next)
- Admin dashboard refreshes without page reload
- Client dashboard seamlessly updates project progress

---

## 6. FEATURE NOT VISIBLE IN CURRENT CODE
(These are NOT implemented; do not hallucinate)

- ❌ Project timeline gantt charts
- ❌ Budget forecasting / variance analysis
- ❌ Worker skill tracking
- ❌ Contractor/Vendor management portal
- ❌ Change order tracking
- ❌ Quality inspections checklist
- ❌ Safety incidents log
- ❌ Mobile app (iOS/Android)
- ❌ SMS notifications
- ❌ Email notifications (beyond auth)

---

## 7. SUCCESS CRITERIA

✅ Users log in via Supabase Auth, not custom JWT  
✅ Admin sees all projects with real-time progress updates  
✅ Supervisors submit attendance, materials, measurements, daily reports with photos  
✅ Clients see only their projects, no financial data, seamless real-time updates  
✅ All data synced to PostgreSQL with proper RLS  
✅ Zero financial data exposed via API to clients  
✅ Deployed on Vercel, connected to Supabase project  

---

**Next Steps:** Begin Phase 1 implementation. Confirm environment variables and Supabase project setup.

