# QMetrix — Where We Are With Your Review

This is our reply to every point you raised. Anything marked Done is already
working on the live site: https://teqade-admin.github.io/qmetrix-webapp/

**What the marks mean** — ✅ Done · 🟡 Partly done · ⏸️ Agreed not to change

---

## In short

| | Count |
|---|---|
| ✅ Done | 31 |
| 🟡 Partly done | 1 |
| ⏸️ Agreed not to change | 2 |

Three of your points were requests for brand-new modules rather than fixes.
Those are listed at the end, under **New feature requests**, for a separate
conversation.

---

## Rajesh Menon — Super Admin

| What you raised | Status | What we did |
|---|---|---|
| Refreshing a page or opening a link directly showed a "404" error page | ✅ | Fixed. You can now refresh any page, or open a link straight to it, and it works. The same fault was breaking password-reset links, so those work now too. |
| Only the assigned approver should be able to approve, and every approval should be logged | ✅ | Each approval step is now tied to a named person, chosen from your employee list. Only that person can approve it. Every change is written to the new Audit Log, showing who did it, when, and what changed. |
| Financial figures should be worked out one way, not differently on each screen | 🟡 | Gross margin, earned value and total cost now come from one shared calculation that every screen uses. **A few smaller totals are still worked out separately** on the Dashboard, Projects and Finance screens (fee agreed, invoiced, outstanding). They currently agree with each other, but we would like to bring them into the same shared calculation to be sure they always will. |
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
| Restrict HR Admin from assigning admin roles in other departments, or add an approval step | ⏸️ | **Agreed not to change, and here is why.** HR is the team that sets a new joiner up in the first place. When HR onboards someone, choosing that person's system role is part of creating their login — it is how the new employee gets any access at all. If HR could only assign roles inside their own department, then every new joiner in Operations or Finance would need a second person from that department to step in before they could even sign in, which would hold up every single arrival. The one thing HR Admin cannot do is create another Super Admin; that is reserved. And every role assignment is recorded in the Audit Log, so you can always see who granted what and when. If you would still prefer an approval step, we are happy to add one — just say. |
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
| Onboarding should check each step before moving on | ✅ | Every step is now required, and the wizard tells you where you stand as you go. Each step names exactly what is still missing, and the last step lists everything outstanding across all four. **Back**, **Next** and **Save as Draft** appear on every step, so you can move around freely and stop part-way and come back. The last step adds **Onboard**, which stays greyed out until nothing is missing — so a half-finished record can never be marked as onboarded by accident. There is also a **Create login** button on the Role step, next to where you choose their system role; it becomes available once you have saved a draft, and changes to "Reset login" if that person already has one, so you can never reset a password by accident. **Your existing staff are not affected** — 12 of your 13 onboarded employees have no contract or document on file, and editing them is deliberately exempt from the new rules. |
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
| The invoice number cannot be typed over | ⏸️ | **Agreed not to change — the number is set by the system.** It is the reference your client quotes when they pay, so it needs to be unique and gap-free, and typing over it would put that at risk. What we did change is *when* it appears: the box used to show a number before the invoice existed, so cancelling threw that number away and left a gap in the sequence. The number is now given at the moment you create the invoice. Alongside this we changed how an invoice moves along. Its status used to be a free choice of five options, so an invoice could be marked paid without ever being sent. It now follows **Draft → Sent → Paid**, one step at a time, with a single button offering the next step. **Overdue happens on its own** — the system works it out from the due date, so an invoice becomes overdue on the day it falls due, and stops being overdue the moment it is paid. An invoice can only be edited while it is a draft; once sent, it opens as a record to read rather than a form to change. We did the same for expense claims: **Pending → Approved → Paid**, with Reject available only while it is still pending, Approve and Reject buttons instead of a dropdown, and each decision now recording who made it and when. Rejected claims also stopped counting as company cost — **AED 2,200 of the AED 9,900 expense total** was money you had decided not to pay. |
| Approving an expense re-ordered the list, so the next click could hit the wrong one | ✅ | Two things were wrong. The approve button was a receipt icon that looked like "view document", so a click meant to open the receipt was quietly approving the claim — it is now a tick. Separately, lists could come back in a different order after a refresh; every list now has a fixed, repeatable order. |
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

**Almost finished** — bringing the last few financial subtotals into the same
shared calculation as the rest.

**Waiting on your decision** — whether HR User should be stopped from *seeing*
salary figures, as well as from changing them.

**Agreed not to change** — HR Admin assigning roles across departments (see the
explanation above), and typing over the invoice number.

**For a separate discussion** — the three new modules above.

---

## One thing we would recommend

All the access rules described here are enforced inside the application. They
control what each person sees and can do through the screens, which is what
matters for everyday use.

They are not yet enforced by the database itself. In practice that means the
protection is very good against ordinary mistakes, but not absolute against
someone deliberately going around the application.

We would recommend adding that second layer before the system holds real salary
and client financial data. The rules are already written down in one place, so
this is a contained piece of work rather than a rebuild.
