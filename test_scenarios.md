# QMetrix — Test Scenarios

Manual test checklist tracked per module. Each scenario lists the expected
behaviour and its current status (`[x]` implemented & verified by build/code,
`[ ]` not yet implemented / needs follow-up).

---

## Time Management

The **Time Management** page has two sections — **Timesheet** and **Leaves** —
each with **Self** and **Team** sub-tabs.

- **Self** = the signed-in user's own records.
- **Team** = the user's reporting line (direct + indirect reports via `manager_id`);
  admin/HR see everyone.

### Timesheet — Self

- [x] User can log a new timesheet entry (Log Hours); employee is fixed to the signed-in user.
- [x] Weekly view shows the current week with day-by-day entries and a daily-hours chart.
- [x] Week navigation (prev / next / today) works.
- [x] "Submit Week for Approval" appears only when the week has draft entries; it moves all drafts → submitted.
- [x] A draft entry can be edited and deleted.
- [x] A submitted entry can be edited and deleted (still pending approval).
- [x] A rejected entry can be edited and re-submitted.
- [x] **An approved entry cannot be edited** — the dialog blocks save with a lock message.
- [x] **An approved entry cannot be deleted** — actions are replaced by a "Locked" indicator (weekly view + All Entries).
- [x] "All Entries" status filter includes all/draft/submitted/approved/rejected for Self.
- [x] Stats: This Week (of 40h target), Total Billable, Non-Billable, Pending Approval.

### Timesheet — Team

- [x] **Drafts are never visible** to a manager — only submitted/approved/rejected entries.
- [x] Default filter is "submitted" (the approval queue); filters are submitted/approved/rejected only (no draft, no all-with-drafts).
- [x] Manager can **approve** a submitted entry → status becomes approved.
- [x] Manager can **reject** a submitted entry → status becomes rejected.
- [x] After approve/reject the entry leaves the "submitted" filter view (still viewable under approved/rejected).
- [x] Manager cannot edit or delete a team member's entry (no edit/delete controls in Team).
- [x] No "Log Hours" button in Team (managers don't log on others' behalf here).
- [x] Stats include **Total Employees** (N = team size).
- [x] **This Week target = 40 × N** employees; progress bar scales to that target.
- [x] Billable / Non-Billable / Pending Approval aggregate across the team (excluding drafts).
- [x] Approver identity is recorded on approve/reject (`approved_by` = signed-in user).
- [ ] Self-approval guard: a manager who is also in their own team list shouldn't approve their own entry — **TODO / confirm policy**.

### Leaves — Self

- [x] User can request leave; employee is fixed to the signed-in user.
- [x] Working days auto-calculate from start/end dates (business days), editable.
- [x] Stats show **Total Leaves**, **Remaining Leaves**, Pending, Approved, Days Approved.
- [x] `Remaining = Total − Approved days − Pending days` (computed over the user's own requests).
- [x] Remaining turns red if negative (over-allocated).
- [x] Request dialog shows a live "X of Y days remaining" balance badge.
- [x] **A request exceeding remaining balance is blocked** with a clear message (shorten dates / contact HR).
- [x] When editing a pending request, its own days are added back before the balance check (no double-count).
- [x] A pending request can be edited and deleted.
- [x] A rejected request can be edited and deleted.
- [x] **An approved request cannot be edited** — save is blocked with a lock message.
- [x] **An approved request cannot be deleted** — actions replaced by a "Locked" indicator.
- [ ] Entitlement is a flat default of 25 days for everyone (no per-employee value yet) — **by decision; revisit if needed**.
- [ ] Leave-type-specific allowances (e.g. sick vs annual counted separately) — **TODO / confirm policy** (currently all types count against one balance).

### Leaves — Team

- [x] **No "Request Leave" button** — Team is approve/reject only.
- [x] Manager can **approve** a pending request.
- [x] Manager can **reject** a pending request.
- [x] Manager cannot edit an approved request (locked).
- [x] Empty state shows no "Request Leave" action in Team.
- [x] Approver identity recorded (`approved_by` = signed-in user) on approve/reject.

### Cross-cutting / edge cases

- [x] Self vs Team datasets are correctly scoped (Self = own; Team = reporting subtree / all for admin-HR).
- [x] Team scope resolves multi-level hierarchy (a manager's manager sees the whole branch below).
- [ ] Concurrency: two approvers acting on the same item — last write wins (no optimistic lock) — **acceptable for now**.
- [ ] Manager with no reports / user with no employee record: Team views show empty, no crash — **verify in app**.
- [x] Date validation (Leaves): end date before start date is rejected with a clear message.
- [ ] Date validation (Leaves): overlapping leave requests for the same user — **TODO / confirm policy**.

---

## Conventions

- `[x]` = implemented; covered by current code and a clean production build.
- `[ ]` = open item — either a deliberate decision, or a follow-up to implement.
- Items marked **TODO** are candidates for the next iteration of Time Management.
