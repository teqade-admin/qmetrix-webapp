# Client Review — Status

Status of every item raised in the customer review. Commits are on `main` and
deployed to https://teqade-admin.github.io/qmetrix-webapp/

**Legend** — ✅ Done · 🟡 Partly done · ⏸️ Not doing (decision) · ⬜ Not started

---

## Rajesh Menon (Super Admin)

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Refresh/direct URL should not return GitHub 404 | ✅ | `d53d30c`. GitHub Pages has no server-side rewrite, so a deep link asked for a file that didn't exist. Added a `404.html` trampoline that restores the route before React mounts. Also fixed 5 redirects and both Supabase `redirectTo` values that dropped the `/qmetrix-webapp` base path — password reset was broken because of it. |
| 2 | Restrict OCRA approvals to assigned approvers; add authorization validation and audit logging | 🟡 | `0af2cde`. Ownership enforced: OCRA roles now map to employee IDs (migration `supabase_deliverable_ocra_owners.sql`) and only the assigned employee can action a step. **Audit logging is partial** — reject/clarify append a timestamped, named entry to the deliverable's comments, but approvals are not logged and there is no dedicated audit table. See "Not started". |
| 3 | Consolidate financial calculations into a single source of truth | 🟡 | `822cc70` introduced `lib/financeMetrics.js` and moved Gross Margin, earned value and cost totals into it. **Dashboard, Projects and Finance still compute their own subtotals** (fee agreed, invoiced, outstanding) independently. Full consolidation is outstanding. |
| 4 | Projects module currency should use configured AED | ✅ | `af3ad0c`. All 11 hardcoded `£` replaced with the configured currency, including form labels. |
| 5 | Remove Access Denied flash during initialization | ✅ | `edbd1ff`. `isLoadingAuth` cleared before the role lookup returned, so route guards read a null role and rendered Access Denied for a beat. The router now waits on the role too. |
| 6 | Project progress showing 0% | ✅ | `6fed8bf`. Progress was a hand-typed field, `NULL` on every project. Now derived: sections → stage → project position on the RIBA ladder. |
| 7 | HR employees getting deleted when updating | ✅ | `64e454f`. **Nothing was ever deleted.** `onboarding_status` was recomputed on every save, so editing any field demoted seeded employees to "in progress", which the All Employees list hides. Completion is now a milestone that an edit cannot revoke. |
| 8 | Own leave should have approve, not just submit | ✅ | `b0f9044`. Super Admin only — they top the approval hierarchy, so nobody else can action their leave. |
| 9 | Deliverables need reject/clarify, not just approve | ✅ | `b9624a2` + migration `supabase_deliverable_clarification.sql`. Both require a written reason, recorded against the deliverable with name, date and step. |

## Anjali Sharma (Ops Admin)

| # | Item | Status | Notes |
|---|---|---|---|
| 10 | Enforce OCRA approval ownership checks | ✅ | `0af2cde`. Same change as #2. Verified against live data: a user assigned as both Checker and Reviewer can action exactly those two steps. |
| 11 | Redirect to Dashboard after login | ✅ | `34a0264`. Login rendered in place without changing the URL, so signing in resumed the previous route. Refreshing a page still keeps you there — only a genuine sign-in redirects. |

## Vikram Iyer (Finance Admin)

| # | Item | Status | Notes |
|---|---|---|---|
| 12 | Invoice numbering `INV-YYYY-NNN` | ✅ | `308cfe7`. Generator returned a bare counter ("7"). Now year-scoped, restarting at 001 each January, and skips numbers already taken so the UNIQUE constraint can't reject an insert. Invoice "7" was already sent to a client and was deliberately **not** renumbered. |

## Priya Nair (HR Admin)

| # | Item | Status | Notes |
|---|---|---|---|
| 13 | Restrict cross-department admin role assignment, or add an approval workflow | ⏸️ | **Decided against.** HR Admin may assign admin roles in any department except Super Admin. A restriction was built and reverted on instruction. Neither the restriction nor an approval workflow will be implemented unless this is revisited. |
| 14 | Invalid leave-date calculation | ✅ | `b0f9044`. `differenceInBusinessDays + 1` reported a Sat–Sun request as 1 working day, and a mistyped year as 52,179. Now counts business days in the range, caps a request at 366 days, and rejects weekend-only ranges. |

## Arjun Reddy (Ops User)

| # | Item | Status | Notes |
|---|---|---|---|
| 15 | Prevent non-assigned users approving OCRA steps | ✅ | `0af2cde`. Same change as #2/#10. |
| 16 | Users should see only their own projects and team man-hours | ⬜ | Projects, Resource Monitor and the Dashboard currently show company-wide data to every role. Needs a scoping rule per role. |

## Sanjay Patel (Finance User)

| # | Item | Status | Notes |
|---|---|---|---|
| 17 | Reduce Finance User to view-only | ✅ | `e0d1042`. Finance and Cost & Value dropped WRITE → READ: invoices and expenses can be viewed but not created, edited or deleted. |

## Meera Joshi (HR User)

| # | Item | Status | Notes |
|---|---|---|---|
| 18 | Restrict HR User to self-service; remove salary/rate/role editing and onboarding | ✅ | `e0d1042`. Employee records are read-only, no role granting, no onboarding, no KPI reviews or resource allocation. Kept approving team timesheets and leave, per instruction. **Caveat:** HR User can still *see* salary and cost rate on the Employment page — the change removed editing, not visibility. Confirm whether that was the intent. |

---

## Enhancements

| # | Item | Status | Notes |
|---|---|---|---|
| 19 | Password visibility toggle | ✅ | `3f1505e`. All five password fields, via a shared component. Keyboard reachable and reports state via `aria-pressed`. |
| 20 | User Management, Reports and Audit Log modules | ⬜ | Three new modules. Largest item on the list; needs scoping before estimating. |
| 21 | Onboarding wizard step-level validation | ⬜ | The wizard lets you advance through all four steps without completing required fields. |
| 22 | Recruitment / Applicant Tracking module | ⬜ | New module. Largest item alongside #20; needs scoping. |
| 23 | Filter option in all sections | ✅ | `81187dc`. Added search + filters to Team, Resource Allocation, Resource Monitor, Deliverables, Workflow and Employment via a shared `FilterBar`. |
| 24 | Logo change | ✅ | **Already available** — Administration → Settings lets an admin upload and change the company logo, which the sidebar reads from `app_settings`. No code change needed; it is a matter of uploading the desired image. |
| 25 | PEOPLE → RESOURCES | ✅ | `fc7b90d`. |

---

## General comments

| # | Item | Status | Notes |
|---|---|---|---|
| 26 | "% complete" stuck at 0%, zeroing Earned Value | ✅ | `6fed8bf` plus a work-section seed. All 8 projects now report 13–93%, and Cost & Value earned value went from £0 to £11,005,300. |
| 27 | Gross Margin contradictory (−442.2% vs 99.1%) | ✅ | `822cc70`. Both pages used the same revenue but different cost bases — one used project cost-to-date, the other expense claims. Now one definition on an earned-value basis: **47.7% on both pages**. |
| 28 | Onboarding can fail to create the login account ("Edge Function returned a non-2xx status code") | ✅ | `3919f27`. That string is supabase-js's generic wrapper; the function's real reason sat unread on `error.context` and is now surfaced. Added a "Create login" retry on each Onboarding card — the edge function is idempotent. |
| 29 | Notification bell non-functional | ✅ | `423c30a`. Now shows what is awaiting you — timesheets and leave to approve, deliverables where you own the next OCRA step, overdue invoices — derived from existing data, so no schema change. Scoped by permission and by ownership. |
| 30 | Invoice # cannot be manually overridden | ⬜ | The field is deliberately read-only so the sequence stays gapless and unique. Allowing an override needs a uniqueness check and a rule for what happens to the auto-sequence. Worth agreeing the intent before changing. |
| 31 | Expense approvals re-sort the list, so a second click can action the wrong row | 🟡 | `97513fd`. All 6 expenses share one `created_at` and the sort had no tiebreaker, so ordering was not guaranteed; every list now breaks ties on `id`. **A reorder could not actually be reproduced** with six rows, so this is hardening rather than a confirmed fix. |
| 32 | No confirmation toast on many actions | ✅ | `b1465b3`. Success confirmations added to 36 of 37 mutations. Also fixed timesheet week-submit, which silently swallowed failures. |
| 33 | Start Date and other wizard fields not persisted | ✅ | `900b31e`. Audited all 21 fields by round-tripping a full record — every one persists. Fixed three real "looks blank on reopening" bugs: a stored `0` rendered blank, and cleared rates/manager silently kept their old values. The exact `start_date` symptom could not be reproduced; report it again with an employee name if it recurs. |
| 34 | "Add Section" does nothing; invoice/expense view icon does nothing | ✅ | `Add Section` sat inside the project edit `<form>` with no `type`, so HTML defaulted it to submit — clicking it saved and closed the dialog instead of adding a section. On expenses the `Receipt` glyph read as "view document" but actually **approved** the expense; it is now a check icon. Invoice PDF generation was an unguarded async call, so any failure was silent — it now reports success or the error. |
| 35 | KPI defaults to a data-less quarter, showing "KPI Score 0" | ✅ | `328869c`. Of 1000 timesheets **none** fall in the current quarter, so every first scorecard read 0. Now opens on the newest period with data (2026-Q2, 670 rows); an explicit choice still wins. |

---

## Summary

| Status | Count |
|---|---|
| ✅ Done | 28 |
| 🟡 Partly done | 2 |
| ⏸️ Not doing | 1 |
| ⬜ Not started | 4 |

Two migrations were applied during this work: `supabase_deliverable_clarification.sql`
and `supabase_deliverable_ocra_owners.sql`.

**Cross-cutting caveat:** all permission work is frontend gating. It hides
actions but does not enforce them against direct API access — server-side RLS
remains outstanding and is the only thing that makes these rules binding.
