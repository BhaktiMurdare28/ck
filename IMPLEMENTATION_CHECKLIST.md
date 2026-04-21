# Next.js + Supabase Implementation Checklist

> Quick reference for rebuilding Core Konstruct features

## Pre-Implementation Requirements

- [ ] Supabase project created (PostgreSQL database configured)
- [ ] Next.js 14+ project initialized with TypeScript + Tailwind CSS
- [ ] `.env.local` with:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
  SUPABASE_SERVICE_ROLE_KEY=xxx
  ```
- [ ] Supabase tables created (see ARCHITECTURE_PLAN.md Section 2)

---

## Phase 1: Auth & Infrastructure

### Authentication Setup
- [ ] Install: `npm install @supabase/supabase-js @supabase/auth-helpers-nextjs`
- [ ] Create `lib/supabase/client.ts` (browser client)
- [ ] Create `lib/supabase/server.ts` (server client)
- [ ] Create `lib/auth/authContext.tsx` (React Context)
- [ ] Create `src/middleware.ts` (route protection)
- [ ] Create `src/app/(auth)/login/page.tsx`
- [ ] Create `src/app/(auth)/register/page.tsx`

### Critical: Existing User Migration
- [ ] Export MongoDB users to CSV
- [ ] Insert into Supabase `users` table
- [ ] Test login with migrated accounts

---

## Phase 2: Admin Dashboard

### Setup
- [ ] Create `src/app/(dashboard)/layout.tsx` (DashboardLayout)
- [ ] Create `lib/supabase/types.ts` (TypeScript interfaces)
- [ ] Create `src/components/layout/Sidebar.tsx`
- [ ] Create `src/components/layout/Topbar.tsx`

### Database
- [ ] Create `projects` table (with budget/spent/labour/material/misc fields)
- [ ] Create `project_stages` table
- [ ] Create `completed_projects` table
- [ ] Implement RLS policies for admin-only access
- [ ] Import MongoDB projects → PostgreSQL

### Components (Build in Order)
1. [ ] `DashboardStats.tsx` (projects count, avg progress, delays)
2. [ ] `ProjectProgressRing.tsx` (SVG circular chart)
3. [ ] `ProjectOverviewCard.tsx` (grid item)
4. [ ] `ProjectsList.tsx` (container)
5. [ ] `StageTracker.tsx` (6-stage timeline)
6. [ ] `BudgetBreakdownBar.tsx` (Labour/Material/Misc stacked bar)
7. [ ] `ProjectDetailModal.tsx` (full project detail)
8. [ ] `src/app/(dashboard)/admin/page.tsx` (tie it all together)

### API Routes
- [ ] `src/api/projects/route.ts` (GET all projects)
- [ ] `src/api/projects/[id]/route.ts` (GET/PUT single project)
- [ ] `src/api/projects/[id]/progress/route.ts` (PUT update progress + stage logic)

### Verification
- [ ] Admin sees all projects
- [ ] Progress updates trigger stage logic
- [ ] Financial breakdown displays correctly

---

## Phase 3: Supervisor Dashboard

### Database
- [ ] Create `workers` table
- [ ] Create `attendance` table (with JSONB workers array)
- [ ] Create `materials` table
- [ ] Create `measurements` table
- [ ] Create `daily_reports` table
- [ ] Create `daily_report_photos` table
- [ ] Implement RLS (supervisor-only access)

### Components
1. [ ] `ProjectSelector.tsx` (dropdown for "My Projects")
2. [ ] `AttendanceGrid.tsx` (worker toggles with initials)
3. [ ] `AttendanceSummary.tsx` (present/absent/total counts)
4. [ ] `MaterialEntryForm.tsx` (item/qty/unit form)
5. [ ] `MaterialsList.tsx` (table with delete)
6. [ ] `MeasurementForm.tsx` (dynamic fields by project type)
7. [ ] `MeasurementHistory.tsx` (previous entries)
8. [ ] `DailyReportForm.tsx` (weather/work/issues/expenses)
9. [ ] `PhotoUploadWidget.tsx` (drag-drop multi-upload)
10. [ ] `PhotoGallery.tsx` (display uploaded photos)
11. [ ] `ProgressSlider.tsx` (update % and manage stages)
12. [ ] `TaskTabs.tsx` (tab navigation between features)
13. [ ] `src/app/(dashboard)/supervisor/page.tsx`

### Sub-Pages
- [ ] `src/app/(dashboard)/supervisor/attendance/page.tsx`
- [ ] `src/app/(dashboard)/supervisor/materials/page.tsx`
- [ ] `src/app/(dashboard)/supervisor/measurements/page.tsx`
- [ ] `src/app/(dashboard)/supervisor/daily-report/page.tsx`
- [ ] `src/app/(dashboard)/supervisor/photos/page.tsx`
- [ ] `src/app/(dashboard)/supervisor/progress/page.tsx`

### API Routes
- [ ] `src/api/attendance/route.ts` (POST, GET filtered)
- [ ] `src/api/materials/route.ts` (POST, GET, DELETE)
- [ ] `src/api/measurements/route.ts` (POST, GET)
- [ ] `src/api/daily-reports/route.ts` (POST, GET, PUT)
- [ ] `src/api/workers/route.ts` (POST, DELETE)
- [ ] `src/api/upload/daily-report-photo/route.ts` (POST multipart)

### Storage
- [ ] Create Supabase Storage bucket: `daily-reports`
- [ ] Configure RLS: supervisors write own, admins/clients read

### Verification
- [ ] Supervisor adds worker, marks attendance, saves to DB
- [ ] Supervisor uploads photo, appears in gallery
- [ ] Supervisor enters materials, appears in history
- [ ] Supervisor submits daily report with expenses
- [ ] Data appears in admin dashboard

---

## Phase 4: Client Dashboard

### Components
1. [ ] `OngoingProjectCard.tsx` (grid card with progress bar)
2. [ ] `ProjectDetailView.tsx` (seamless detail with real-time updates)
3. [ ] `TimelineStages.tsx` (milestone breakdown)
4. [ ] `CompletedProjectCard.tsx` (portfolio item)
5. [ ] `GalleryGrid.tsx` (photo gallery)
6. [ ] `QuickProjectModal.tsx` (summary modal)
7. [ ] `src/app/(dashboard)/client/page.tsx` (ongoing projects)

### Sub-Pages
- [ ] `src/app/(dashboard)/client/projects/page.tsx`
- [ ] `src/app/(dashboard)/client/projects/[id]/page.tsx`
- [ ] `src/app/(dashboard)/client/gallery/page.tsx`
- [ ] `src/app/(dashboard)/client/completed/page.tsx`

### API Routes
- [ ] `src/api/projects/route.ts` (already exists, respects RLS)
- [ ] `src/api/completed-projects/route.ts` (GET public)

### RLS Verification (CRITICAL)
- [ ] Client user fetches `/api/projects` → only gets own projects
- [ ] Client user fetches daily report photos → only sees own project reports
- [ ] Client user **cannot** access financial fields in project response

### Verification
- [ ] Client sees only their projects
- [ ] Progress updates in real-time
- [ ] No financial data visible in UI or API
- [ ] Gallery shows only client's project photos

---

## Phase 5: Polish & Deploy

### Error Handling
- [ ] Toast component for notifications
- [ ] Error boundaries in pages
- [ ] Validation for all forms
- [ ] Handle network failures gracefully

### Real-Time (Optional)
- [ ] Supabase Realtime subscriptions in admin/supervisor dashboards
- [ ] Test updates propagate without page reload

### Performance
- [ ] Implement React Query or SWR for data fetching
- [ ] Image optimization (next/image)
- [ ] Lazy load modals/tabs
- [ ] Test Lighthouse scores (target: 80+)

### Security
- [ ] Verify no `SUPABASE_SERVICE_ROLE_KEY` exposed in browser
- [ ] Test RLS prevents unauthorized data access
- [ ] Validate file upload (images only, size limits)
- [ ] Check token expiration handling

### Testing
- [ ] Unit tests for components
- [ ] E2E tests for auth flow
- [ ] E2E tests for supervisor data entry
- [ ] E2E test for client read-only access

### Deployment
- [ ] Set up Vercel project
- [ ] Add environment variables
- [ ] Deploy staging → test
- [ ] Deploy production
- [ ] Monitor Vercel logs

---

## Implementation Order (Recommended)

```
1. Phase 1 (Auth) → Test login
2. Phase 2 (Admin) → Test project visibility
3. Phase 3 (Supervisor) → Test data entry features
4. Phase 4 (Client) → Test read-only access + RLS
5. Phase 5 (Polish) → Deploy
```

---

## Key Files Reference

| Purpose | File |
|---------|------|
| Type definitions | `lib/supabase/types.ts` |
| Project constants | `lib/utils/constants.ts` |
| Auth flow | `lib/auth/authContext.tsx` |
| Route protection | `src/middleware.ts` |
| Admin dashboard | `src/app/(dashboard)/admin/page.tsx` |
| Supervisor tasks | `src/app/(dashboard)/supervisor/page.tsx` |
| Client projects | `src/app/(dashboard)/client/page.tsx` |

---

## Common Errors & Solutions

| Error | Solution |
|-------|----------|
| "Row-level security is missing policy..." | Add RLS policies to table (see ARCHITECTURE_PLAN.md Section 2) |
| Client sees other client's projects | Check `projects` RLS policy filters by `client_id = auth.uid()` |
| Financial data leaked to client | Verify API returns only `progress`, `currentStage`, `status` for clients |
| Photo upload fails | Ensure Supabase Storage bucket exists and RLS allows supervisor write |
| Real-time updates don't work | Verify Realtime subscription created, check auth token validity |

---

## Final Deliverables

✅ Next.js app with role-based dashboards  
✅ Supabase PostgreSQL database with RLS  
✅ Admin views all projects with budget tracking  
✅ Supervisors enter attendance, materials, measurements, daily reports  
✅ Clients see project progress (no financials) with photos  
✅ Deployed on Vercel  
✅ All data synced to PostgreSQL  

