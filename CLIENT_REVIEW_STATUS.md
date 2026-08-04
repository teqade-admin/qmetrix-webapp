# QMetrix — Review Response

This is our reply to every point you raised. Anything marked Done is already
working on the live site: https://teqade-admin.github.io/qmetrix-webapp/

**What the marks mean** — ✅ Done · ⏸️ Consideration to not change

---

## In short

| | Count |
|---|---|
| ✅ Done | 32 |
| ⏸️ Consideration to not change | 2 |

Three of your points were requests for brand-new modules rather than fixes.
Those are listed at the end, under **New feature requests**, for a separate
conversation.

---

## Rajesh Menon — Super Admin

| What you raised | Status | What we did |
|---|---|---|
| Refreshing a page or opening a link directly showed a "404" error page | ✅ | Fixed. You can now refresh any page, or open a link straight to it, and it works. The same fault was breaking password-reset links, so those work now too. |
| Only the assigned approver should be able to approve, and every approval should be logged | ✅ | Each approval step is now tied to a named person, chosen from your employee list. Only that person can approve it. Every change is written to the new Audit Log, showing who did it, when, and what changed. |
| Financial figures should be worked out one way, not differently on each screen | ✅ | Every financial figure now comes from one shared calculation. Two real disagreements were found and fixed. **Total Invoiced** was counting a cancelled invoice on Finance and Cost & Value, overstating it by **AED 189,000**. And the Projects page showed **AED 7,270,000** invoiced, taken from a number typed onto each project, against **AED 3,789,000** of real invoices — a gap of AED 3.48m. Invoiced now always means the invoices actually raised. |
| Projects showed the wrong currency | ✅ | Projects were showing pounds no matter what currency you had set. Every amount now follows the currency you choose. |
| "Access Denied" flashed up while the app was loading | ✅ | The app was deciding what you could see before it had finished looking up who you are. It now waits, so the message no longer appears. |
| Every project showed 0% complete | ✅ | Progress used to be a number someone had to type in, and nobody ever had. It is now worked out automatically: work sections add up into stage progress, and stages add up into overall project progress. |
| Employees seemed to be deleted when you updated them | ✅ | **Nobody was ever deleted.** Editing any field caused the system to re-check whether the person was fully onboarded, and that could push a finished employee back to "in progress". The All Employees list only shows finished ones, so they vanished from view. Finishing onboarding is now permanent — editing someone can never undo it. |
| You can submit your own leave but not approve it | ✅ | As Super Admin you can now approve or reject your own leave, since there is nobody above you to do it. |
| Deliverables awaiting approval only offered "Approve" | ✅ | Reviewers can now **Approve**, **Reject**, or ask for **Clarification**. Reject and Clarify both ask for a written reason, which is saved against the deliverable along with the reviewer's name and the date. |

## Anjali Sharma — Ops Admin

| What you raised | Status | What we did |
|---|---|---|
| Only the assigned person should be able to approve | ✅ | Done, as above. We tested it on your live data: someone who is named as both Checker and Reviewer can approve exactly those two steps and nothing else. |
| After signing in, users should land on the Dashboard | ✅ | Signing in now takes you to the Dashboard instead of reopening whatever page you were on last. Refreshing a page still keeps you where you are. |

## Vikram Iyer — Finance Admin

| What you raised | Status | What we did |
|---|---|---|
| Invoice numbers should follow the INV-YYYY-NNN format | ✅ | New invoices are numbered INV-2026-007 onwards. The count starts again each January, and the system skips any number already used, so you can never end up with two invoices sharing a number. **We left one older invoice, numbered simply "7", exactly as it was** — it has already gone to a client, and changing the number on an invoice they already hold would stop it matching their records. |

## Priya Nair — HR Admin

| What you raised | Status | What we did |
|---|---|---|
| Restrict HR Admin from assigning admin roles in other departments, or add an approval step | ⏸️ | **Consideration to not change, and here is why.** HR sets up every new joiner, and choosing their system role is part of creating their login — it is how they get any access at all. Limit HR to their own department, and every new arrival in Operations or Finance would wait on someone else before they could even sign in. HR still cannot create a Super Admin, and every role granted is recorded in the Audit Log. Happy to add an approval step if you would prefer one. |
| Leave requests showed impossible "Working Days" figures | ✅ | A Saturday-to-Sunday request was showing as 1 working day, and a request with a mistyped year showed 52,179. Working days are now counted properly, a weekend-only request is refused with an explanation, and no single request can exceed 366 days. |

## Arjun Reddy — Ops User

| What you raised | Status | What we did |
|---|---|---|
| Users who are not assigned should not be able to approve workflow steps | ✅ | Done, as above — only the named approver can act on a step. |
| Users should see only their own projects and team hours, not everyone's | ✅ | Ops Admin still sees everything. Everyone else now sees only the projects they manage, created, or have work assigned on. This holds even if someone is given a direct link to another project. Team hours follow your reporting line: your own people, and anyone below them. |

## Sanjay Patel — Finance User

| What you raised | Status | What we did |
|---|---|---|
| Finance User has too much access — it should be view-only | ✅ | Finance and Cost & Value are now read-only for this role. Invoices and expenses can be looked at, but not created, changed or deleted. |

## Meera Joshi — HR User

| What you raised | Status | What we did |
|---|---|---|
| HR User should be limited to self-service, without editing salaries, rates, roles or onboarding | ✅ | Employee records are now read-only for HR User: no editing salary, cost rate or system role, no onboarding, no granting of roles, no KPI reviews. We kept their ability to approve their team's timesheets and leave, as agreed. **One thing to confirm:** HR User can still *see* salary and cost rate on the Employment page — we removed the ability to change them, not to view them. Please tell us if you would like these hidden as well. |

---

## Improvements you asked for

| What you raised | Status | What we did |
|---|---|---|
| Show/hide button on password fields | ✅ | Added to all five password boxes, and usable by keyboard as well as mouse. |
| Audit Log | ✅ | Built, under **Data → Audit Log**. It records every change made anywhere in the system: who made it, when, and exactly what the value was before and after. It is recorded by the database itself, so it also picks up changes made outside these screens. You see your own actions and those of everyone who reports to you at any level; Super Admins see the whole company. You can filter by module, by type of action, or by searching. |
| Onboarding should check each step before moving on | ✅ | Every step is now required, and each one tells you exactly what is still missing. **Back**, **Next** and **Save as Draft** are on every step, so you can move around freely and come back later. The last step adds **Onboard**, greyed out until nothing is missing, so a half-finished record can never be marked onboarded by accident. A **Create login** button now sits beside the system role. Your existing staff are not affected. |
| Add filters to every section | ✅ | Search and filters added to Team, Resource Allocation, Resource Monitor, Deliverables, Workflow and Employment, on top of the ones already there. Long lists are now split into pages instead of showing everything at once. |
| Change the logo | ✅ | This was already possible — **Administration → Settings** lets you upload your logo and change the company name and subtitle. All that is left is for you to upload the image you want. |
| Rename PEOPLE to RESOURCES | ✅ | Renamed. |

---

## General points you raised

| What you raised | Status | What we did |
|---|---|---|
| Every project stuck at 0% complete, which made Earned Value and Cost Variance meaningless | ✅ | Progress is now worked out automatically rather than typed in. All eight projects now show real figures, and Earned Value on the Cost & Value screen went from £0 to £11,005,300 — so Cost Variance means something again. |
| Gross Margin showed two different numbers: −442.2% on the Dashboard and 99.1% on Cost & Value | ✅ | The two screens were using the same income figure but counting costs differently — one counted project costs, the other counted expense claims. Both now use the same definition: the value of work done, less what it cost to do it. Both report **47.7%**. |
| Onboarding could fail to create a login, leaving a new joiner unable to sign in | ✅ | The error message was generic and the real reason was being thrown away, so nobody knew what had gone wrong. HR now sees the actual reason, and every Onboarding card has a **Create login** button to try again. |
| The notification bell did nothing, for every role | ✅ | The bell now shows what is waiting for you — timesheets and leave to approve, deliverables where the next sign-off is yours, and overdue invoices — and each one takes you to the right page. |
| The invoice number cannot be typed over | ⏸️ | **Consideration to not change — the system sets it.** It is the reference your client quotes when paying, so it must stay unique and gap-free. It is now given at the moment you create the invoice, rather than shown beforehand and wasted if you cancel. We also made the status a proper sequence: **Draft → Sent → Paid**, one step at a time, so an invoice can no longer be marked paid without being sent. **Overdue happens on its own**, from the due date. Only drafts can be edited. |
| Approving an expense re-ordered the list, so the next click could hit the wrong one | ✅ | Two faults. The approve button was a receipt icon that looked like "view document", so a click meant to open the receipt was quietly approving the claim — it is now a tick. Lists could also come back in a different order after a refresh; every list now has a fixed order. Expense claims also follow a sequence now: **Pending → Approved → Paid**, each decision recording who made it and when. Rejected claims no longer count as company cost — **AED 2,200 of your AED 9,900 total**. |
| Many actions gave no confirmation | ✅ | Every action now confirms itself — green when it worked, red when it did not — and says what happened ("Timesheet approved", "Expense approved"). The messages clear on their own, and the close button works. |
| Start Date and other onboarding fields were not being saved | ✅ | We checked all 21 fields the onboarding wizard collects, and every one saves correctly. Three other genuine faults turned up while we were looking: a saved value of 0 showed as blank, and clearing a rate, a salary or a manager quietly kept the old value instead. All three are fixed. |
| "Add Section" did nothing, and the document icon beside invoices and expenses did nothing | ✅ | "Add Section" was closing the form instead of adding a section. The invoice PDF button was failing without saying so; it now tells you what went wrong. |
| KPI & Performance opened on a quarter with no data, showing "KPI Score 0" | ✅ | The scorecard now opens on the **last completed quarter** instead of the current one. The current quarter is still being filled in as people log time, so everything reads low — today it holds 4 timesheet entries, against 975 in the quarter just finished. Four employees still score 0, but only because they have logged no time at all this year; that is a true figure rather than a fault. |

---

## New feature requests

These three are not fixes to what exists — they are new modules. We would like to
sit down with you separately to agree what each one should do before we quote or
build anything.

| Request | What we need to agree with you |
|---|---|
| **User Management module** | A single place to manage users and their permissions. We need to know how it should differ from what HR already does, and who should be allowed to use it. |
| **Reports module** | Which reports you need, what each should show, what format they come in (on screen, PDF, spreadsheet), and who receives them and how often. |
| **Recruitment / Applicant Tracking module** | Your hiring process end to end: where candidates come from, what stages they pass through, who reviews them, and how a successful candidate becomes an onboarded employee. |

---

## Still open

**Waiting on your decision** — whether HR User should be stopped from *seeing*
salary figures, as well as from changing them.

**Consideration to not change** — HR Admin assigning roles across departments (see the
explanation above), and typing over the invoice number.

**For a separate discussion** — the three new modules above.

---

## One thing we would recommend

**Through the website, the access rules hold.** If an Ops User types the web
address of an admin page straight into their browser, they get "Access denied".
Every page checks the person's role before it shows anything, and project and
work-section pages check again for that particular record. Guessing a link gets
you nowhere.

**Outside the website, they do not.** The rules live in the application, not in
the database. Someone signed in with an ordinary account, using a technical tool
rather than the website, could still read data the screens would never show them
— salaries, invoices, the audit log — because the database itself currently
accepts any signed-in user.

This needs somebody with a valid login, some technical knowledge and deliberate
intent; it is not something a user stumbles into. But we would recommend closing
it before the system holds real salary and client financial information. The
rules are already written down in one place, so it is a contained piece of work
rather than a rebuild.
