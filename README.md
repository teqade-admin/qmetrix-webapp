# QMetrix — Operations Suite

QMetrix is an operations platform for a quantity‑surveying / cost‑management consultancy. It brings HR, time & leave, performance, bid pipeline, clients, projects, delivery (OCRA), finance and resourcing into one role‑aware app.

Built with **React + Vite + Tailwind**, **Supabase** (Postgres, Auth, Storage, Edge Functions) and **TanStack Query**.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Database setup (migrations)](#database-setup-migrations)
- [Demo data & logins](#demo-data--logins)
- [System roles & permissions](#system-roles--permissions)
- [Project structure](#project-structure)
- [Deployment](#deployment)

---

## Features

**People**
- **Employment** — onboard employees in a 3‑step wizard (Personal → Role & Allocation → Documents); staged onboarding checklist derived from real data; multi‑level manager hierarchy; private, signed‑URL document/contract storage (multiple contracts with active/inactive status).
- **Team** — roster + a top‑down **org chart** with collapsible levels (L1…All).
- **KPI & Performance** — auto‑computed **scorecard** (utilisation, billable hours, revenue vs targets → weighted KPI score) and periodic **reviews** with history; Self / Team / Employees scopes.
- **Time Management** — timesheets and leave with submit → approve/reject workflow, leave balances, Self / Team / Employees scopes and a reporting‑level filter.
- **Resource Allocation & Monitor**.

**Operations**
- **Bid Management** — client database, 2‑step bid creation, fee calculator, and **live multi‑currency conversion** (per‑bid currency → base currency).
- **Projects**, **Deliverables** (OCRA: Originator/Checker/Reviewer/Authoriser), **Workflow** (milestones).

**Finance** — invoices, expenses, **Cost & Value** dashboard.

**Administration** — **Settings**: company branding (logo upload), base currency, and KPI scorecard targets.

Cross‑cutting: role‑based access control (nav, route guards, action gating), search and pagination on listings.

---

## Tech stack

| Area | Choice |
|---|---|
| Frontend | React 18, Vite, React Router |
| Styling | Tailwind CSS + shadcn/ui |
| Data | Supabase (Postgres, Auth, Storage, Edge Functions) |
| State/data fetching | TanStack Query |
| Charts / PDF / Zip | Recharts, jsPDF, JSZip |
| FX rates | open.er-api.com (no key) |

---

## Getting started

```bash
# 1. install
npm install

# 2. configure env (see .env.example)
cp .env.example .env
#   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY (server-side scripts only)

# 3. run the database migrations (see below)

# 4. dev server
npm run dev

# build
npm run build
```

---

## Database setup (migrations)

All SQL lives in [`migrations/`](migrations) and is **idempotent** — run each in the **Supabase SQL editor**, in order. For a fresh project run them all; for an existing project run the ones you haven't applied.

| # | File | Purpose |
|---|------|---------|
| 1 | `supabase_schema.sql` | Base schema (tables, RLS, triggers) |
| 2 | `supabase_migration_patch.sql` | Incremental patch + `documents` storage bucket |
| 3 | `supabase_manager_hierarchy.sql` | Self‑referencing `manager_id` |
| 4 | `supabase_branding.sql` | `app_settings` + public `branding` bucket |
| 5 | `supabase_clients.sql` | `clients` table + bid `client_id`/`client_phone` |
| 6 | `supabase_currency.sql` | `base_currency` + per‑bid `currency` |
| 7 | `supabase_hr_kpi.sql` | onboarding checklist, KPI target, goals |
| 8 | `supabase_employee_docs.sql` | employee `contract_url`/`documents`/`allocated_projects` |
| 9 | `supabase_employee_docs_private.sql` | **private** `employee-docs` bucket (signed URLs) |
| 10 | `supabase_employee_contracts.sql` | multiple `contracts` (active/inactive) |
| 11 | `supabase_roles.sql` | 7‑role RBAC model on `app_role` |
| 12 | `supabase_performance_reviews.sql` | `performance_reviews` + KPI config |
| 13 | `supabase_seed.sql` | **optional** demo data (⚠️ deletes business data) |

> The Edge Function in `supabase/functions/create-employee-account` provisions employee logins; deploy it with `supabase functions deploy create-employee-account`.

---

## Demo data & logins

`migrations/supabase_seed.sql` loads a UAE‑based demo org (Indian names, AED), a department reporting hierarchy and full status coverage for every flow. It **preserves** auth users, roles and app settings.

After seeding, create one login per role with:

```bash
node scripts/create-role-logins.mjs    # uses SUPABASE_SERVICE_ROLE_KEY from .env
```

| Role | Email | Password |
|---|---|---|
| Super Admin | rajesh.menon@qmetrix.ae | `Qmetrix@123` |
| Ops Admin | anjali.sharma@qmetrix.ae | `Qmetrix@123` |
| Finance Admin | vikram.iyer@qmetrix.ae | `Qmetrix@123` |
| HR Admin | priya.nair@qmetrix.ae | `Qmetrix@123` |
| Ops User | arjun.reddy@qmetrix.ae | `Qmetrix@123` |
| Finance User | sanjay.patel@qmetrix.ae | `Qmetrix@123` |
| HR User | meera.joshi@qmetrix.ae | `Qmetrix@123` |

---

## System roles & permissions

Access is enforced on three levels — **navigation**, **route guards**, and **action buttons** — driven by [`src/lib/permissions.js`](src/lib/permissions.js). A user's role comes from their employee **System Role** (`app_role`).

**Legend:** ● Full (view · create · edit · delete) · ◐ Edit (view · create · edit, **no delete**) · ○ View only · — No access

| Feature | Super Admin | HR Admin | HR User | Ops Admin | Ops User | Finance Admin | Finance User |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **Dashboard** | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| **People → Employment** | ● | ● | ◐ | — | — | — | — |
| **People → Team** | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| **People → KPI & Performance** | ● | ● | ◐ | ○ | ○ | ○ | ○ |
| **People → Time Management** | ● | ● | ◐ | ○ | ○ | ○ | ○ |
| **People → Resource Allocation** | ● | ● | ◐ | ○ | ○ | ○ | ○ |
| **People → Resource Monitor** | ● | ● | ○ | — | — | — | — |
| **Operations → Bid Management** | ● | — | — | ● | — | — | — |
| **Operations → Projects** | ● | — | — | ● | ○ | — | — |
| **Operations → Deliverables** | ● | — | — | ● | ○ | — | — |
| **Operations → Workflow** | ● | — | — | ● | ○ | — | — |
| **Finance → Cost & Value** | ● | — | — | — | — | ● | ◐ |
| **Finance → Finance** | ● | — | — | — | — | ● | ◐ |
| **Data → Data Management** | ● | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ |
| **Administration → Settings** | ● | — | — | — | — | — | — |

**Notes**
- **Team scope** (Time Management & KPI) = your **direct reports**; a level filter (L1…All) drills into deeper reports.
- **Employees scope** is HR/Super‑Admin only. **HR Admin/User** see **every** employee *except* other HR Admins/Users and Super Admins; **Super Admin** sees their indirect reports (never equals/superiors).
- **Role assignment** (in Employment): Super Admin grants any role; HR Admin grants all except Super Admin; HR User grants only `*_user` roles.
- Employees can always view/edit their own **Profile**; pay details are never shown on the Team page.
- **Dashboard** widgets are role-scoped: each card/chart appears only if the role can read its source area (HR roles see staff & onboarding, Ops roles see bids/projects, Finance roles see revenue/invoices; Super Admin sees everything).
- **Data Management** folders are role-scoped: every role can view & upload, but only sees folders for areas it can read (HR roles → *HR*; Ops → *Projects*/*Bids*; Finance → *Finance*; *Templates*/*General* are shared). Only Super Admin can delete documents.

---

## Project structure

```
src/
  pages/            route pages (HRModule, TimeManagement, KPIPerformance, BidManagement, …)
  components/
    shared/         Pagination, LevelFilter, StatCard, CurrencyContext, …
    hr/ bids/ …     feature components
  lib/
    permissions.js  RBAC matrix + helpers
    orgHierarchy.js manager_id tree helpers
    kpiScorecard.js KPI scorecard computation
    AuthContext.jsx Supabase auth + effective role
  api/              Supabase entity client
entities/           JSON schemas mirroring DB tables
migrations/         ordered, idempotent SQL
scripts/            create-role-logins.mjs, integration tests
supabase/functions/ create-employee-account (Edge Function)
```

---

## Deployment

The app builds to static assets and deploys to **GitHub Pages**:

```bash
npm run build      # GITHUB_PAGES=true npm run predeploy for Pages base path
npm run deploy     # gh-pages -d dist
```

Set the Supabase env vars as GitHub Actions secrets so the Pages build can reach the backend.
