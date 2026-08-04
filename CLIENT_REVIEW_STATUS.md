# QMetrix — Client Review Status

Progress against both rounds of review feedback. Everything marked Done is live
at https://teqade-admin.github.io/qmetrix-webapp/

**Legend** — ✅ Done · 🟡 Partly done · ⏸️ Not doing (agreed) · ⬜ Not started

---

## Summary

| | Round 1 (modules) | Round 2 (detailed) | Total |
|---|---|---|---|
| ✅ Done | 12 | 30 | **42** |
| 🟡 Partly done | 2 | 1 | **3** |
| ⏸️ Not doing | 0 | 1 | **1** |
| ⬜ Not started | 2 | 3 | **5** |

Five items remain outstanding. Three are new modules that need scoping with you
(User Management, Reports, Recruitment); the other two are described at the end.

---

# Round 1 — Module review

## Access Control

| Observation | Status | What was done |
|---|---|---|
| Control panel for adding users/clients and defining permissions is unclear | 🟡 | **Role-based access is fully implemented** — seven roles (Super Admin, HR Admin/User, Ops Admin/User, Finance Admin/User) with per-page permissions covering navigation, page access and individual buttons. Roles are assigned from the Employment screen. **However**, there is still no single admin console listing users and permissions in one place — that is the User Management module, which remains outstanding. |

## Dashboard

| Observation | Status | Notes |
|---|---|---|
| Dashboard appears satisfactory — no action required | ✅ | No change made. Two dashboard defects reported later in Round 2 were fixed (see Gross Margin and % complete). |

## Branding

| Observation | Status | What was done |
|---|---|---|
| Logo needs to be updated | ✅ | Administration → Settings now uploads and changes the company logo, along with company name and subtitle. The sidebar reads from it. Uploading your preferred image is all that remains. |

## HR Module

| Observation | Status | What was done |
|---|---|---|
| Employee status after onboarding unclear in "All Employees" | ✅ | Every employee row carries a status tag, and the Onboarding tab shows onboarding state separately with a progress bar and step checklist. |
| Visibility of HR module unclear when access is restricted | ✅ | HR pages remain visible to other departments except Employment and Resource Monitor, so staff can still submit and view their own requests without seeing personnel records. |

## Onboarding Process

| Observation | Status | What was done |
|---|---|---|
| Steps not structured clearly | ✅ | Onboarding is now a guided wizard — Personal → Role → Contracts → Documents — with a checklist showing what is complete and what is outstanding. |
| Missing structured steps | ✅ | All six steps are tracked: document collection, contract upload, role assignment, cost rate, system role, and project allocation (optional). Each is **derived from real data** rather than ticked by hand, so the checklist cannot disagree with the record. |

## KPI Tracking

| Observation | Status | What was done |
|---|---|---|
| KPI checklist not clearly structured | ✅ | Replaced with a computed scorecard covering **utilisation, billable hours, non-billable hours, project count and revenue**, each measured against a target with weightings you control in Settings. Scores are calculated from timesheets — nothing is typed in. Periodic reviews are recorded separately, with history. |

## Leave Tracker

| Observation | Status | What was done |
|---|---|---|
| Total leave and leave balance missing | ✅ | The Leave tab shows **Total Leaves** and **Remaining Leaves** (entitlement less approved and pending). Requests exceeding the remaining balance are refused with an explanation. |

## Timesheets

| Observation | Status | What was done |
|---|---|---|
| Weekly recording and approval workflow unclear | ✅ | Defined as submit → approve/reject. Staff submit a week; the manager sees a queue of submitted entries and approves or rejects. Approved entries lock. |
| Line manager assignment unclear | ✅ | Employees now have a manager, forming a multi-level reporting hierarchy. Approvals, team views and data scoping all follow it, at any depth (L1, L2, … All). |
| Leave summary integration missing | 🟡 | Timesheets and Leave sit side by side under Time Management with a shared team and level filter, but the **timesheet view itself does not yet show leave taken in the same period**. Outstanding. |

## Bid Management

| Observation | Status | What was done |
|---|---|---|
| Currency conversion control not available | ✅ | A base currency is set in Settings, each bid carries its own currency, and fees convert live using published rates. |
| Client database details incomplete | ✅ | Clients are now a full record — company, contact person, email, phone, address, sector and status — with their own tab. Bids link to a client rather than repeating their details. |

---

# Round 2 — Detailed review

## Rajesh Menon (Super Admin)

| Item | Status | Detail |
|---|---|---|
| Refresh/direct URL should not return GitHub 404 | ✅ | Refreshing or opening a link to any page now works. The site had no handling for direct links, so any page other than the home page returned a hosting error. This also fixed password-reset links, which were broken for the same reason. |
| Restrict OCRA approvals to assigned approvers; add validation and audit logging | ✅ | Each OCRA role is now tied to a specific employee record, and only that person can action their step. Every change is recorded in the new Audit Log with who, when, and what changed. |
| Consolidate financial calculations into a single source of truth | 🟡 | Gross margin, earned value and total cost now come from one shared definition used by every screen. **Dashboard, Projects and Finance still calculate some subtotals independently** (fee agreed, invoiced, outstanding) — consistent today, but not yet centralised. |
| Projects module should use configured AED currency | ✅ | Projects displayed pounds regardless of the configured currency. All amounts, including form labels, now follow the base currency. |
| Remove Access Denied flash during initialization | ✅ | The app briefly rendered "Access Denied" on every page load while it looked up the user's role. It now waits for the role before deciding. |
| Project progress showing 0% | ✅ | Progress was typed by hand and had never been filled in. It is now calculated: work sections roll up into stage progress, and stages into overall project progress. |
| HR employees getting deleted when updating | ✅ | **No employee was ever deleted.** Editing any field re-evaluated onboarding status and could push a fully onboarded employee back to "in progress", which hid them from the All Employees list. Onboarding completion is now a milestone that editing cannot revoke. |
| Own leave should have approve, not only submit | ✅ | Super Admin can approve or reject their own leave, as nobody sits above them to do it. |
| Deliverables need reject/clarify, not only approve | ✅ | Reviewers can now Approve, Reject, or request Clarification. The latter two require a written reason, recorded against the deliverable with name, date and step. |

## Anjali Sharma (Ops Admin)

| Item | Status | Detail |
|---|---|---|
| Enforce OCRA approval ownership checks | ✅ | As above. Verified against live data: someone assigned as both Checker and Reviewer can action exactly those two steps and no others. |
| Redirect to Dashboard after login | ✅ | Signing in now lands on the Dashboard rather than resuming the previous page. Refreshing a page still keeps you where you were. |

## Vikram Iyer (Finance Admin)

| Item | Status | Detail |
|---|---|---|
| Standardise invoice numbering to INV-YYYY-NNN | ✅ | New invoices are numbered INV-2026-007 onward. The sequence restarts each January and skips any number already used. **One existing invoice numbered "7" was deliberately left alone** — it has already been issued to a client, and changing an issued invoice number would not match their records. |

## Priya Nair (HR Admin)

| Item | Status | Detail |
|---|---|---|
| Restrict cross-department admin role assignment, or add approval workflow | ⏸️ | **Agreed not to change.** HR Admin can continue to assign admin roles in any department except Super Admin. Neither a restriction nor an approval workflow will be added unless you would like us to revisit it. |
| Invalid leave-date calculation | ✅ | A Saturday–Sunday request reported 1 working day, and a mistyped year reported 52,179. Working days are now counted properly, weekend-only requests are refused, and a single request is capped at 366 days. |

## Arjun Reddy (Ops User)

| Item | Status | Detail |
|---|---|---|
| Prevent non-assigned users approving OCRA steps | ✅ | As above. |
| Users should see only their own projects and team hours | ✅ | Ops Admin sees the whole portfolio. Everyone else sees only projects they manage, created, or have work assigned on — enforced on the list **and** when a project link is opened directly. Work sections follow the reporting line: your own, plus anyone reporting to you at any level. |

## Sanjay Patel (Finance User)

| Item | Status | Detail |
|---|---|---|
| Reduce Finance User to view-only | ✅ | Finance and Cost & Value are now read-only for this role — invoices and expenses can be viewed but not created, edited or deleted. |

## Meera Joshi (HR User)

| Item | Status | Detail |
|---|---|---|
| Restrict HR User to self-service; remove salary, rate, role and onboarding permissions | ✅ | Employee records are read-only for HR User: no editing salary, cost rate or system role, no onboarding, no role granting, no KPI reviews. Approving team timesheets and leave was retained, as agreed. **Please note:** HR User can still *see* salary and cost rate on the Employment page — the change removed editing, not visibility. Tell us if it should be hidden entirely. |

---

## Enhancements

| Item | Status | Detail |
|---|---|---|
| Password visibility toggle | ✅ | Added to all five password fields, and keyboard accessible. |
| **User Management** module | ⬜ | Not started. This is the centralised admin console raised in Round 1. Needs scoping with you. |
| **Reports** module | ⬜ | Not started. Needs scoping — which reports, what format, and who receives them. |
| **Audit Log** module | ✅ | Delivered, under Data → Audit Log. Records every change across the system — who, when, and the exact before/after of each field. Captured in the database itself, so it also covers changes made outside these screens. Visibility follows the reporting line: your own actions, your team's at any level, and company-wide for Super Admin. Filterable by module, action and free text. |
| Onboarding wizard step-level validation | ⬜ | Not started. The wizard currently allows moving between steps without completing required fields. |
| Recruitment / Applicant Tracking module | ⬜ | Not started. A new module — needs scoping with you. |
| Filter option in all sections | ✅ | Search and filters added to Team, Resource Allocation, Resource Monitor, Deliverables, Workflow and Employment, alongside those already present. Work Sections filter by project, stage, assignee and status. |
| Logo change | ✅ | Available in Administration → Settings (see Branding above). |
| Change PEOPLE to RESOURCES | ✅ | Navigation group renamed. |

---

## General comments

| Item | Status | Detail |
|---|---|---|
| "% complete" stuck at 0%, zeroing Earned Value | ✅ | Progress is now calculated rather than typed. All eight projects report real figures, and Cost & Value earned value moved from £0 to £11,005,300 — Cost Variance is meaningful again. |
| Gross Margin contradictory (−442.2% vs 99.1%) | ✅ | The two screens used the same revenue but different cost bases. Both now use one definition — value of work done, less the cost of doing it — and report **47.7%**. |
| Onboarding can fail to create the login account | ✅ | The error shown was a generic wrapper; the real reason was being discarded. HR now sees what actually failed, and each Onboarding card has a **Create login** button to retry. |
| Notification bell non-functional | ✅ | The bell now shows what is awaiting you — timesheets and leave to approve, deliverables where you own the next sign-off, and overdue invoices — each linking to the relevant page. |
| Invoice # cannot be manually overridden | ⬜ | **Not changed, and we would like your view.** The field is deliberately read-only so the sequence stays gapless and unique, which matters for a financial record. Allowing an override needs an agreed rule for duplicates and for what happens to the automatic sequence afterwards. |
| Expense approvals re-sort, actioning the wrong row | ✅ | Two causes addressed. The approve icon was a receipt symbol that read as "view document", so a click meant to inspect silently approved — it is now a tick. Separately, list ordering had no tiebreaker, so rows could reorder between refreshes; every list now orders deterministically. |
| No confirmation toast on many actions | ✅ | Every action now confirms — green for success, red for failure — naming what happened ("Timesheet approved", "Expense approved"). Confirmations close on their own, and the close button works. |
| Start Date and wizard fields not persisted | ✅ | We audited all 21 fields the wizard collects; every one saves correctly. Three genuine faults were found and fixed: a stored value of 0 displayed as blank, and clearing a rate, salary or manager silently kept the old value. |
| "Add Section" does nothing; invoice/expense icon does nothing | ✅ | "Add Section" was submitting the form instead of adding a section, so the dialog closed and nothing appeared. Fixed. The invoice PDF button failed silently on error and now reports what went wrong. |
| KPI defaults to a data-less quarter, showing "KPI Score 0" | ✅ | Of 1,000 timesheet entries, none fall in the current quarter, so every user's first view showed zero. It now opens on the most recent period containing data. |

---

## Beyond the review

Work carried out alongside the review items, arising from the same problems:

- **Work Sections** are now a module in their own right. A manager assigns a
  package of work to someone in their team with a stage, status (To Do, In
  Progress, Blocked, Completed), planned hours and dates. Each has its own page
  with comments and a full activity history. Timesheets can book against
  assigned work, which fills in the project and hours.
- **Projects** have their own page — Overview, Stages, Programme, Work Sections,
  Financials and Logs — reachable at a readable address such as
  `/Projects/EMR-001`. Project codes are generated automatically.
- **Stages** are shown as a tree. A stage can only be completed when its work is
  genuinely finished, and the button to advance appears only when it is.
- **Bids now connect to projects.** Winning a bid records the link both ways, so
  a project shows the bid it came from with fee proposed against fee agreed and
  cost to date.
- **An employee's project allocation** is now derived from the work assigned to
  them, rather than a separate list that nothing kept up to date.

---

## What remains

**Needs scoping with you** — three new modules: **User Management** (the
centralised admin console), **Reports**, and **Recruitment / Applicant Tracking**.

**Small, ready when you are** — onboarding wizard step validation; showing leave
alongside the timesheet view; finishing the consolidation of financial subtotals.

**Awaiting your decision** — whether the invoice number should be manually
overridable, and whether HR User should be prevented from *seeing* salary as
well as editing it.

**Agreed not to do** — restricting cross-department admin role assignment.

---

## One technical note

The access rules described above are enforced in the application: they control
what each role can see and do through the interface. They are not yet enforced
at the database layer, which means the protection is not absolute against
someone deliberately bypassing the application.

We recommend adding database-level enforcement before the system holds live
salary and client financial data. The rules are already defined in one place,
so this is a contained piece of work rather than a redesign.
