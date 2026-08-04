# QMetrix — Client Review Status

Progress against every item raised in the review. Everything marked Done is live
at https://teqade-admin.github.io/qmetrix-webapp/

**Legend** — ✅ Done · 🟡 Partly done · ⏸️ Not doing (agreed) · ⬜ Not started

---

## Summary

| Status | Count |
|---|---|
| ✅ Done | 31 |
| 🟡 Partly done | 1 |
| ⏸️ Not doing (agreed) | 1 |
| ⬜ Not started | 4 |

Of the four not started, three are new modules that need scoping with you
(User Management, Reports, Recruitment). The fourth is set out at the end.

---

## Rajesh Menon — Super Admin

| Item | Status | Detail |
|---|---|---|
| Refresh/direct URL access should not return GitHub 404 pages | ✅ | Refreshing or opening a link to any page now works. The site had no handling for direct links, so any page other than the home page returned a hosting error. This also fixed password-reset links, which were broken for the same reason. |
| Restrict OCRA approvals to assigned approvers only. Add authorization validation and audit logging | ✅ | Each OCRA role is now tied to a specific employee record, and only that person can action their step. Every change is recorded in the new Audit Log with who, when, and what changed. |
| Consolidate financial calculations into a single source of truth across Dashboard, Projects, Finance and Cost & Value | 🟡 | Gross margin, earned value and total cost now come from one shared definition used by every screen. **Dashboard, Projects and Finance still calculate some subtotals independently** (fee agreed, invoiced, outstanding). They agree today, but are not yet centralised. |
| Correct Projects module currency formatting to use configured AED currency | ✅ | Projects displayed pounds regardless of the configured currency. All amounts, including form labels, now follow the base currency. |
| Remove Access Denied flash during application initialization | ✅ | The application briefly showed "Access Denied" on every page load while it looked up the user's role. It now waits for the role before deciding what to show. |
| Fix project progress calculation showing 0% for all projects | ✅ | Progress was a figure typed by hand and had never been filled in. It is now calculated: work sections roll up into stage progress, and stages into overall project progress. |
| HR module employees getting deleted when updating | ✅ | **No employee was ever deleted.** Editing any field re-evaluated onboarding status, which could push a fully onboarded employee back to "in progress" — and the All Employees list only shows completed ones, so they disappeared from view. Onboarding completion is now a milestone that editing cannot revoke. |
| Hierarchy of approvals — own leave should have approve, not only submission | ✅ | Super Admin can approve or reject their own leave, as nobody sits above them to do it. |
| Deliverables — pending approval should offer reject/clarify, not only approve | ✅ | Reviewers can now Approve, Reject, or request Clarification. The latter two require a written reason, recorded against the deliverable with the reviewer's name, date and step. |

## Anjali Sharma — Ops Admin

| Item | Status | Detail |
|---|---|---|
| Enforce OCRA approval ownership checks | ✅ | As above. Verified against live data: someone assigned as both Checker and Reviewer can action exactly those two steps and no others. |
| Redirect users to Dashboard after login instead of reopening previous route | ✅ | Signing in now lands on the Dashboard rather than resuming the previous page. Refreshing a page still keeps you where you were. |

## Vikram Iyer — Finance Admin

| Item | Status | Detail |
|---|---|---|
| Standardise invoice numbering to INV-YYYY-NNN format | ✅ | New invoices are numbered INV-2026-007 onward. The sequence restarts each January and skips any number already used, so no duplicate can occur. **One existing invoice numbered "7" was deliberately left unchanged** — it has already been issued to a client, and altering an issued invoice number would no longer match their records. |

## Priya Nair — HR Admin

| Item | Status | Detail |
|---|---|---|
| Restrict cross-department admin role assignment, or implement approval workflow | ⏸️ | **Agreed not to change.** HR Admin can continue to assign admin roles in any department except Super Admin. Neither a restriction nor an approval workflow will be added unless you would like us to revisit this. |
| Fix invalid leave-date calculation displaying unrealistic Working Days values | ✅ | A Saturday–Sunday request reported 1 working day, and a mistyped year reported 52,179. Working days are now counted correctly, weekend-only requests are refused with an explanation, and a single request is capped at 366 days. |

## Arjun Reddy — Ops User

| Item | Status | Detail |
|---|---|---|
| Prevent non-assigned users from approving OCRA workflow steps | ✅ | As above — only the named approver for a step can action it. |
| Users should see only their own projects and team man hours, not all | ✅ | Ops Admin sees the whole portfolio. Everyone else sees only projects they manage, created, or have work assigned on — enforced both on the list and when a project link is opened directly. Work assignments follow the reporting line: your own, plus anyone reporting to you at any level. |

## Sanjay Patel — Finance User

| Item | Status | Detail |
|---|---|---|
| Reduce Finance User permissions to a limited/view-only access model | ✅ | Finance and Cost & Value are now read-only for this role — invoices and expenses can be viewed but not created, edited or deleted. |

## Meera Joshi — HR User

| Item | Status | Detail |
|---|---|---|
| Restrict HR User to self-service. Remove employee-wide salary, rate, role editing and onboarding permissions | ✅ | Employee records are read-only for HR User: no editing salary, cost rate or system role, no onboarding, no role granting, no KPI reviews. Approving team timesheets and leave was retained, as agreed. **Please note:** HR User can still *see* salary and cost rate on the Employment page — the change removed editing, not visibility. Please confirm whether it should be hidden entirely. |

---

## Enhancements

| Item | Status | Detail |
|---|---|---|
| Password visibility toggle | ✅ | Added to all five password fields, and reachable by keyboard. |
| User Management module | ⬜ | Not started. A centralised console for users and permissions. Needs scoping with you. |
| Reports module | ⬜ | Not started. Needs scoping — which reports, in what format, and who receives them. |
| Audit Log module | ✅ | Delivered, under Data → Audit Log. Records every change across the system: who, when, and the exact before and after of each field. Recorded in the database itself, so it also covers changes made outside these screens. Visibility follows the reporting line — your own actions, your team's at any level, and company-wide for Super Admin. Filterable by module, action and free text. |
| Onboarding wizard step-level validation | ⬜ | Not started. The wizard currently allows moving between steps without completing the required fields. |
| Recruitment / Applicant Tracking module | ⬜ | Not started. A new module — needs scoping with you. |
| Filter option to be added in all the sections | ✅ | Search and filters added to Team, Resource Allocation, Resource Monitor, Deliverables, Workflow and Employment, alongside those already in place. Long lists are now paged rather than rendered in full. |
| Logo change | ✅ | Administration → Settings uploads and changes the company logo, along with company name and subtitle. Uploading your preferred image is all that remains. |
| Change PEOPLE to RESOURCES | ✅ | Navigation group renamed. |

---

## General comments

| Item | Status | Detail |
|---|---|---|
| Project "% complete" stuck at 0% everywhere, zeroing Earned Value and making Cost Variance meaningless | ✅ | Progress is now calculated rather than typed. All eight projects report real figures, and earned value on Cost & Value moved from £0 to £11,005,300 — Cost Variance is meaningful again. |
| Gross Margin reported as two contradictory numbers: −442.2% on Dashboard vs 99.1% in Cost & Value | ✅ | The two screens used the same revenue figure but different cost bases — one counted project costs, the other expense claims. Both now use a single definition, the value of work done less the cost of doing it, and report **47.7%**. |
| Onboarding can fail to create a login account, leaving a new hire unable to sign in | ✅ | The message shown was a generic wrapper and the real reason was being discarded. HR now sees what actually failed, and each Onboarding card has a **Create login** button to retry. |
| Notification bell non-functional on every role | ✅ | The bell now shows what is awaiting you — timesheets and leave to approve, deliverables where you own the next sign-off, and overdue invoices — each linking to the relevant page. |
| Invoice # field cannot be manually overridden | ✅ | The number is now editable — but only while the invoice is a draft, and it is checked against existing invoices so two can never share one. Once the invoice is sent it becomes fixed, since it is by then the client's reference for the payment. This came with a wider change to how an invoice progresses: status was a free choice of five values, so an invoice could be marked paid without ever being sent. It now follows **Draft → Sent → Paid**, one step at a time, with a single button offering the next step. **Overdue is automatic** — derived from the due date, so an invoice becomes overdue on the day it falls due and stops being overdue as soon as it is paid. Editing of any field is likewise a draft-only privilege; a sent invoice opens as a record to read, not a form to change. |
| Expense approvals re-sort the list, so a second click can action the wrong expense | ✅ | Two causes addressed. The approve control was a receipt icon that read as "view document", so a click meant to inspect silently approved the expense — it is now a tick. Separately, list ordering had no tiebreaker, so rows could come back in a different order after a refresh; every list now orders deterministically. |
| Many actions give no confirmation | ✅ | Every action now confirms — green for success, red for failure — naming what happened ("Timesheet approved", "Expense approved"). Confirmations clear on their own, and the close button works. |
| Start Date and other wizard fields not persisted | ✅ | We audited all 21 fields the onboarding wizard collects, and every one saves correctly. Three genuine faults were found and fixed in the process: a stored value of 0 displayed as blank, and clearing a rate, salary or manager silently kept the previous value. |
| "Add Section" does nothing; document/view icon next to invoices and expenses does nothing | ✅ | "Add Section" was submitting the form instead of adding a section, so the dialog closed and nothing appeared. The invoice PDF button failed silently when generation errored, and now reports what went wrong. |
| KPI & Performance defaults to a data-less quarter, showing "KPI Score 0" | ✅ | Of 1,000 timesheet entries, none fall in the current quarter, so every user's first view of their scorecard showed zero. It now opens on the most recent period that contains data. |

---

## What remains

**Needs scoping with you** — three new modules: **User Management**, **Reports**,
and **Recruitment / Applicant Tracking**.

**Small, ready when you are** — onboarding wizard step validation, and finishing
the consolidation of financial subtotals.

**Awaiting your decision** — whether HR User should be prevented from *seeing*
salary as well as editing it.

**Agreed not to do** — restricting cross-department admin role assignment.

---

## One technical note

The access rules described above are enforced within the application: they
control what each role can see and do through the interface. They are not yet
enforced at the database layer, which means the protection is not absolute
against someone deliberately bypassing the application.

We recommend adding database-level enforcement before the system holds live
salary and client financial data. The rules are already defined in one place,
so this is a contained piece of work rather than a redesign.
