-- ============================================================================
-- QMetrix demo seed — UAE firm, Indian names, AED. Department reporting lines
-- and full status coverage across every flow.
-- WARNING: DELETES all business data. Preserves auth users / roles / app_settings.
-- Run in the Supabase SQL editor AFTER all migrations. Re-runnable.
-- ============================================================================

BEGIN;

UPDATE public.app_settings SET base_currency = 'AED' WHERE id = true;

DELETE FROM public.performance_reviews;
DELETE FROM public.timesheets;
DELETE FROM public.leave_requests;
DELETE FROM public.resource_allocations;
DELETE FROM public.deliverables;
DELETE FROM public.milestones;
DELETE FROM public.invoices;
DELETE FROM public.expenses;
DELETE FROM public.documents;
DELETE FROM public.bids;
DELETE FROM public.projects;
DELETE FROM public.clients;
DELETE FROM public.employees;

-- 2. Clients (UAE-based).
INSERT INTO public.clients (company_name, contact_person, phone, email, sector, address, website, status) VALUES
('Emaar Developments',     'Rohit Malhotra',  '+971 4 555 0011', 'rohit.malhotra@emaar.example',   'commercial',     'Downtown, Dubai',            'https://emaar.example',    'active'),
('Aldar Infrastructure',   'Suresh Pillai',   '+971 2 555 0142', 'suresh.pillai@aldar.example',    'infrastructure', 'Al Raha, Abu Dhabi',         'https://aldar.example',    'active'),
('Burjeel Health',         'Dr. Kavita Rao',  '+971 2 555 0190', 'kavita.rao@burjeel.example',     'healthcare',     'Corniche, Abu Dhabi',        'https://burjeel.example',  'active'),
('GEMS Education Group',    'Imran Sheikh',    '+971 4 555 0177', 'imran.sheikh@gems.example',      'education',      'Al Barsha, Dubai',           'https://gems.example',     'active'),
('Sobha Residential',      'Anita Desai',     '+971 4 555 0288', 'anita.desai@sobha.example',      'residential',    'Sobha Hartland, Dubai',      'https://sobha.example',    'prospect'),
('Jebel Ali Industrial',   'Faisal Khan',     '+971 4 555 0123', 'faisal.khan@jaindustrial.example','industrial',    'Jebel Ali Free Zone, Dubai', 'https://jaindustrial.example','active'),
('Majid Al Futtaim',       'Sara Haddad',     '+971 4 555 0301', 'sara.haddad@maf.example',        'commercial',     'City Centre, Dubai',         'https://maf.example',      'active'),
('Dubai Culture Authority','Omar Saleh',      '+971 4 555 0322', 'omar.saleh@dca.example',         'government',     'Al Fahidi, Dubai',           'https://dca.example',      'active');

-- 3. Employees. Department reporting lines:
--   Only the 3 dept admins report to the MD. Staff report within their department,
--   sometimes to a same-role lead (ops_user->ops_user, hr_admin->hr_admin, etc.).
INSERT INTO public.employees
  (full_name, email, phone, department, job_title, role, app_role, hourly_rate, cost_rate, salary, status, start_date, onboarding_status, manager_name) VALUES
-- Top
('System Administrator', 'admin@qmetrixconsultancy.co',   '+971 4 710 0000', 'executive',          'System Administrator',     'director',            'super_admin',   NULL, NULL, NULL, 'active', '2018-01-01', 'completed', NULL),
('Rajesh Menon',        'rajesh.menon@qmetrix.ae',        '+971 4 710 0001', 'executive',          'Managing Director',        'director',            'super_admin',   850, 430, 780000, 'active', '2018-03-01', 'completed', NULL),
-- Department admins → report to MD
('Anjali Sharma',       'anjali.sharma@qmetrix.ae',       '+971 4 710 0002', 'project_management', 'Operations Director',      'associate_director', 'ops_admin',     700, 360, 600000, 'active', '2019-06-15', 'completed', 'Rajesh Menon'),
('Vikram Iyer',         'vikram.iyer@qmetrix.ae',         '+971 4 710 0003', 'finance',            'Finance Director',         'associate_director', 'finance_admin', 700, 360, 590000, 'active', '2019-09-02', 'completed', 'Rajesh Menon'),
('Priya Nair',          'priya.nair@qmetrix.ae',          '+971 4 710 0004', 'administration',     'HR Director',              'associate_director', 'hr_admin',      560, 280, 420000, 'active', '2020-01-20', 'completed', 'Rajesh Menon'),
-- Operations → report to Ops Admin (or a senior ops_user)
('Arjun Reddy',         'arjun.reddy@qmetrix.ae',         '+971 4 710 0005', 'quantity_surveying', 'Senior Quantity Surveyor', 'senior_consultant',  'ops_user',      560, 280, 410000, 'active', '2020-05-11', 'completed', 'Anjali Sharma'),
('Deepa Krishnan',      'deepa.krishnan@qmetrix.ae',      '+971 4 710 0006', 'cost_management',    'Senior Cost Consultant',   'senior_consultant',  'ops_user',      540, 270, 400000, 'active', '2021-02-08', 'completed', 'Anjali Sharma'),
('Karthik Subramaniam', 'karthik.subramaniam@qmetrix.ae', '+971 4 710 0007', 'quantity_surveying', 'Quantity Surveyor',        'consultant',          'ops_user',      430, 215, 290000, 'active', '2021-08-23', 'completed', 'Arjun Reddy'),
('Neha Gupta',          'neha.gupta@qmetrix.ae',          '+971 4 710 0008', 'cost_management',    'Junior Cost Consultant',   'junior_consultant',   'ops_user',      320, 160, 195000, 'active', '2022-09-05', 'completed', 'Deepa Krishnan'),
('Rohit Sharma',        'rohit.sharma@qmetrix.ae',        '+971 4 710 0013', 'quantity_surveying', 'Quantity Surveyor',        'consultant',          'ops_user',      425, 210, 285000, 'active', '2022-04-18', 'completed', 'Arjun Reddy'),
-- Finance → report to Finance Admin (or a senior finance_user)
('Sanjay Patel',        'sanjay.patel@qmetrix.ae',        '+971 4 710 0009', 'finance',            'Senior Finance Analyst',   'senior_consultant',  'finance_user',  360, 180, 250000, 'active', '2022-11-14', 'completed', 'Vikram Iyer'),
('Ananya Iyer',         'ananya.iyer@qmetrix.ae',         '+971 4 710 0014', 'finance',            'Finance Analyst',          'analyst',             'finance_user',  300, 150, 200000, 'active', '2023-01-30', 'completed', 'Sanjay Patel'),
-- HR → report to HR Admin (incl. a second hr_admin and a 2-level hr_user chain)
('Rohan Mehta',         'rohan.mehta@qmetrix.ae',         '+971 4 710 0011', 'administration',     'HR Manager',               'senior_consultant',  'hr_admin',      480, 240, 340000, 'active', '2021-05-10', 'completed', 'Priya Nair'),
('Meera Joshi',         'meera.joshi@qmetrix.ae',         '+971 4 710 0010', 'administration',     'HR Officer',               'consultant',          'hr_user',       360, 180, 230000, 'active', '2023-03-27', 'completed', 'Priya Nair'),
('Pooja Shah',          'pooja.shah@qmetrix.ae',          '+971 4 710 0012', 'administration',     'HR Coordinator',           'administrator',       'hr_user',       320, 160, 200000, 'active', '2023-07-15', 'completed', 'Meera Joshi'),
-- Onboarding examples (Onboarding tab; not in All Employees) — covers not_started + in_progress
('Aisha Rahman',        'aisha.rahman@qmetrix.ae',        '+971 4 710 0015', 'cost_management',    'Cost Consultant',          'consultant',          'ops_user',      440, NULL, NULL, 'active', CURRENT_DATE - 6, 'in_progress', 'Anjali Sharma'),
('Rahul Verma',         'rahul.verma@qmetrix.ae',         '+971 4 710 0016', 'quantity_surveying', 'Quantity Surveyor',        'consultant',          'ops_user',      430, 215,  NULL, 'active', CURRENT_DATE - 2, 'in_progress', 'Arjun Reddy'),
('Vivek Anand',         'vivek.anand@qmetrix.ae',         '+971 4 710 0017', 'finance',            'Finance Trainee',          'analyst',             'finance_user',  NULL, NULL, NULL, 'active', CURRENT_DATE - 1, 'not_started', 'Vikram Iyer');

-- Resolve manager_id from manager_name; link logins by email.
UPDATE public.employees e SET manager_id = m.id FROM public.employees m WHERE e.manager_name = m.full_name;
UPDATE public.employees e SET user_id = u.id FROM auth.users u WHERE e.user_id IS NULL AND lower(e.email) = lower(u.email);

-- 4. Bids — every status: won, submitted, in_progress, draft, lost, withdrawn.
INSERT INTO public.bids
  (title, client_id, client_name, client_contact, client_phone, client_email, description, sector, currency, estimated_value, fee_proposal, submission_date, status, probability, lead_consultant, notes) VALUES
('Emaar Tower – Cost Management',  (SELECT id FROM public.clients WHERE company_name='Emaar Developments'),   'Emaar Developments',   'Rohit Malhotra', '+971 4 555 0011', 'rohit.malhotra@emaar.example',   'Cost management for a 48-storey commercial tower.', 'commercial',     'AED', 220000000, 3300000, CURRENT_DATE - 120, 'won',         95, 'Anjali Sharma', 'Awarded; kicked off.'),
('Aldar Bridge – QS Services',     (SELECT id FROM public.clients WHERE company_name='Aldar Infrastructure'), 'Aldar Infrastructure', 'Suresh Pillai',  '+971 2 555 0142', 'suresh.pillai@aldar.example',    'QS for a major causeway.',                          'infrastructure', 'AED', 550000000, 6400000, CURRENT_DATE - 95,  'won',         90, 'Arjun Reddy',   'Awarded.'),
('Burjeel Hospital Wing',          (SELECT id FROM public.clients WHERE company_name='Burjeel Health'),       'Burjeel Health',       'Dr. Kavita Rao', '+971 2 555 0190', 'kavita.rao@burjeel.example',     'Cost planning for an acute care wing.',             'healthcare',     'AED', 300000000, 4100000, CURRENT_DATE - 40,  'submitted',   60, 'Anjali Sharma', 'Awaiting decision.'),
('GEMS Campus Phase 2',            (SELECT id FROM public.clients WHERE company_name='GEMS Education Group'),  'GEMS Education Group', 'Imran Sheikh',   '+971 4 555 0177', 'imran.sheikh@gems.example',      'Feasibility and cost advice.',                      'education',      'AED', 130000000, 1900000, CURRENT_DATE - 30,  'submitted',   55, 'Deepa Krishnan','Shortlisted.'),
('Sobha Riverside Homes',          (SELECT id FROM public.clients WHERE company_name='Sobha Residential'),     'Sobha Residential',    'Anita Desai',    '+971 4 555 0288', 'anita.desai@sobha.example',      'Cost management for 320 apartments.',               'residential',    'AED', 160000000, 2400000, CURRENT_DATE - 15,  'in_progress', 45, 'Arjun Reddy',   'Preparing proposal.'),
('Jebel Ali Logistics Hub',        (SELECT id FROM public.clients WHERE company_name='Jebel Ali Industrial'), 'Jebel Ali Industrial', 'Faisal Khan',    '+971 4 555 0123', 'faisal.khan@jaindustrial.example','QS for a logistics hub.',                           'industrial',     'AED', 410000000, 5000000, CURRENT_DATE - 10,  'in_progress', 40, 'Karthik Subramaniam','In progress.'),
('Emaar Retail Park',              (SELECT id FROM public.clients WHERE company_name='Emaar Developments'),    'Emaar Developments',   'Rohit Malhotra', '+971 4 555 0011', 'rohit.malhotra@emaar.example',   'Retail park cost plan.',                            'commercial',     'AED', 82000000,  1200000, CURRENT_DATE - 5,   'draft',       30, 'Deepa Krishnan','Early stage.'),
('Aldar Depot Refurbishment',      (SELECT id FROM public.clients WHERE company_name='Aldar Infrastructure'), 'Aldar Infrastructure', 'Suresh Pillai',  '+971 2 555 0142', 'suresh.pillai@aldar.example',    'Refurbishment cost advice.',                        'infrastructure', 'AED', 41000000,  640000,  CURRENT_DATE - 70,  'lost',        15, 'Arjun Reddy',   'Lost on fee.'),
('MAF Mall Extension',             (SELECT id FROM public.clients WHERE company_name='Majid Al Futtaim'),     'Majid Al Futtaim',     'Sara Haddad',    '+971 4 555 0301', 'sara.haddad@maf.example',        'Mall extension cost plan.',                         'commercial',     'AED', 95000000,  1450000, CURRENT_DATE - 55,  'withdrawn',   10, 'Deepa Krishnan','Client paused project.'),
('Dubai Heritage Museum',          (SELECT id FROM public.clients WHERE company_name='Dubai Culture Authority'),'Dubai Culture Authority','Omar Saleh',  '+971 4 555 0322', 'omar.saleh@dca.example',         'Museum restoration cost advice.',                   'government',     'AED', 68000000,  1050000, CURRENT_DATE - 3,   'draft',       35, 'Karthik Subramaniam','Drafting.');

-- 5. Projects — cover all statuses.
INSERT INTO public.projects
  (name, project_code, client_name, description, sector, project_value, fee_agreed, fee_invoiced, cost_to_date, earned_value, riba_stage, status, project_manager, start_date, end_date) VALUES
('Emaar Tower',       'EMR-001', 'Emaar Developments',     '48-storey commercial tower.',     'commercial',     220000000, 3300000, 1400000, 980000,  1600000, 'stage_5', 'construction',     'Anjali Sharma', CURRENT_DATE - 110, CURRENT_DATE + 300),
('Aldar Bridge',      'ALD-002', 'Aldar Infrastructure',   'Major causeway.',                 'infrastructure', 550000000, 6400000, 2400000, 1900000, 2800000, 'stage_4', 'pre_construction', 'Arjun Reddy',   CURRENT_DATE - 90,  CURRENT_DATE + 420),
('Burjeel Hospital',  'BUR-003', 'Burjeel Health',         'New acute care wing.',            'healthcare',     300000000, 4100000, 820000,  690000,  1000000, 'stage_3', 'design',           'Anjali Sharma', CURRENT_DATE - 60,  CURRENT_DATE + 360),
('GEMS Campus',       'GEM-004', 'GEMS Education Group',    'Campus expansion.',               'education',      130000000, 1900000, 280000,  250000,  420000,  'stage_2', 'feasibility',      'Deepa Krishnan',CURRENT_DATE - 45,  CURRENT_DATE + 210),
('Sobha Riverside',   'SOB-005', 'Sobha Residential',      '320 riverside apartments.',       'residential',    160000000, 2400000, 1100000, 820000,  1400000, 'stage_5', 'construction',     'Arjun Reddy',   CURRENT_DATE - 75,  CURRENT_DATE + 250),
('Marina Walk Retail','MAR-006', 'Majid Al Futtaim',       'Waterfront retail strip.',        'commercial',     78000000,  1150000, 0,       30000,   40000,   'stage_1', 'kick_off',         'Karthik Subramaniam',CURRENT_DATE - 8, CURRENT_DATE + 400),
('Heritage Museum',   'HER-007', 'Dubai Culture Authority','Museum restoration.',             'government',     54000000,  860000,  860000,  720000,  860000,  'stage_6', 'post_completion',  'Deepa Krishnan',CURRENT_DATE - 320, CURRENT_DATE + 30),
('Old Souk Refurb',   'OLD-008', 'Aldar Infrastructure',   'Heritage souk refurbishment.',    'infrastructure', 22000000,  410000,  410000,  360000,  410000,  'stage_7', 'closed',           'Arjun Reddy',   CURRENT_DATE - 500, CURRENT_DATE - 60);

-- 6. Timesheets — last 120 weekdays. Status varies: current week draft/submitted,
--    ~5% rejected historically, rest approved. Only onboarded staff.
INSERT INTO public.timesheets (employee_name, project_name, date, hours, billable, status, riba_stage, task_description, week_ending, approved_by)
SELECT e.full_name, p.name, d::date,
       round((6 + random() * 2)::numeric, 1),
       (random() < CASE WHEN e.role IN ('director','associate_director') THEN 0.55 ELSE 0.82 END),
       CASE
         WHEN d >= date_trunc('week', CURRENT_DATE) THEN (ARRAY['draft','submitted'])[1 + floor(random()*2)::int]
         WHEN random() < 0.05 THEN 'rejected'
         ELSE 'approved'
       END,
       'detailed_design', 'Project delivery work',
       (date_trunc('week', d)::date + 6),
       CASE WHEN d < date_trunc('week', CURRENT_DATE) THEN COALESCE(e.manager_name, 'Anjali Sharma') END
FROM public.employees e
CROSS JOIN generate_series((CURRENT_DATE - INTERVAL '120 days')::date, CURRENT_DATE, INTERVAL '1 day') AS d
CROSS JOIN LATERAL (SELECT name FROM public.projects WHERE status NOT IN ('closed') ORDER BY random() LIMIT 1) AS p
WHERE EXTRACT(dow FROM d) BETWEEN 1 AND 5 AND e.onboarding_status = 'completed';

-- 7. Leave requests — pending, approved, rejected, cancelled.
INSERT INTO public.leave_requests (employee_id, employee_name, leave_type, start_date, end_date, days_requested, reason, status, approved_by) VALUES
((SELECT id FROM public.employees WHERE full_name='Deepa Krishnan'),      'Deepa Krishnan',      'annual',        CURRENT_DATE - 20, CURRENT_DATE - 16, 5, 'Family holiday',  'approved',  'Anjali Sharma'),
((SELECT id FROM public.employees WHERE full_name='Karthik Subramaniam'), 'Karthik Subramaniam', 'sick',          CURRENT_DATE - 9,  CURRENT_DATE - 8,  2, 'Flu',             'approved',  'Arjun Reddy'),
((SELECT id FROM public.employees WHERE full_name='Neha Gupta'),          'Neha Gupta',          'annual',        CURRENT_DATE + 12, CURRENT_DATE + 14, 3, 'Long weekend',    'pending',   NULL),
((SELECT id FROM public.employees WHERE full_name='Rohit Sharma'),        'Rohit Sharma',        'annual',        CURRENT_DATE + 4,  CURRENT_DATE + 9,  4, 'Vacation',        'rejected',  'Arjun Reddy'),
((SELECT id FROM public.employees WHERE full_name='Sanjay Patel'),        'Sanjay Patel',        'annual',        CURRENT_DATE + 5,  CURRENT_DATE + 6,  2, 'Personal',        'pending',   NULL),
((SELECT id FROM public.employees WHERE full_name='Ananya Iyer'),         'Ananya Iyer',         'compassionate', CURRENT_DATE - 2,  CURRENT_DATE - 1,  2, 'Family matter',   'cancelled', NULL),
((SELECT id FROM public.employees WHERE full_name='Meera Joshi'),         'Meera Joshi',         'study',         CURRENT_DATE + 20, CURRENT_DATE + 21, 2, 'CIPD exam',       'approved',  'Priya Nair'),
((SELECT id FROM public.employees WHERE full_name='Pooja Shah'),          'Pooja Shah',          'annual',        CURRENT_DATE + 30, CURRENT_DATE + 33, 4, 'Trip',            'pending',   NULL);

-- 8. Deliverables — OCRA; covers not_started, in_progress, under_review, approved/issued, rejected.
INSERT INTO public.deliverables (title, project_name, riba_stage, deliverable_type, due_date, originator, checker, reviewer, authoriser, originator_status, checker_status, reviewer_status, authoriser_status, overall_status, version) VALUES
('Stage 4 Cost Plan',       'Emaar Tower',     'stage_4', 'cost_plan',          CURRENT_DATE + 10, 'Deepa Krishnan',      'Arjun Reddy',   'Anjali Sharma', 'Rajesh Menon', 'approved', 'approved', 'pending',  'pending', 'under_review', 'v2.1'),
('Bridge BoQ',              'Aldar Bridge',    'stage_4', 'boq',                CURRENT_DATE + 18, 'Karthik Subramaniam', 'Arjun Reddy',   'Anjali Sharma', 'Rajesh Menon', 'approved', 'pending',  'pending',  'pending', 'in_progress',  'v1.0'),
('Hospital Feasibility',    'Burjeel Hospital','stage_2', 'feasibility_report', CURRENT_DATE - 5,  'Deepa Krishnan',      'Anjali Sharma', 'Anjali Sharma', 'Rajesh Menon', 'approved', 'approved', 'approved', 'approved', 'issued',       'v1.0'),
('Campus Cost Report',      'GEMS Campus',     'stage_2', 'cost_report',        CURRENT_DATE + 7,  'Neha Gupta',          'Deepa Krishnan','Anjali Sharma', 'Rajesh Menon', 'pending',  'pending',  'pending',  'pending', 'not_started',  'v0.1'),
('Riverside Tender Report', 'Sobha Riverside', 'stage_4', 'tender_report',      CURRENT_DATE + 14, 'Karthik Subramaniam', 'Arjun Reddy',   'Anjali Sharma', 'Rajesh Menon', 'approved', 'approved', 'pending',  'pending', 'under_review', 'v1.2'),
('Marina Procurement Plan', 'Marina Walk Retail','stage_1','procurement_strategy',CURRENT_DATE + 25,'Rohit Sharma',        'Karthik Subramaniam','Arjun Reddy','Rajesh Menon','rejected', 'pending',  'pending',  'pending', 'rejected',     'v0.2');

-- 9. Invoices — draft, sent, paid, overdue, cancelled.
INSERT INTO public.invoices (invoice_number, project_name, client_name, amount, tax_amount, total_amount, issue_date, due_date, status, description) VALUES
('INV-2026-001', 'Emaar Tower',      'Emaar Developments',     700000,  35000, 735000,  CURRENT_DATE - 40, CURRENT_DATE - 10, 'paid',      'Stage 4 fee instalment'),
('INV-2026-002', 'Aldar Bridge',     'Aldar Infrastructure',   1200000, 60000, 1260000, CURRENT_DATE - 25, CURRENT_DATE + 5,  'sent',      'Mobilisation fee'),
('INV-2026-003', 'Sobha Riverside',  'Sobha Residential',      550000,  27500, 577500,  CURRENT_DATE - 50, CURRENT_DATE - 20, 'overdue',   'Stage 3 fee instalment'),
('INV-2026-004', 'Burjeel Hospital', 'Burjeel Health',         420000,  21000, 441000,  CURRENT_DATE - 5,  CURRENT_DATE + 25, 'draft',     'Design stage fee'),
('INV-2026-005', 'Heritage Museum',  'Dubai Culture Authority',310000,  15500, 325500,  CURRENT_DATE - 80, CURRENT_DATE - 50, 'paid',      'Final account'),
('INV-2026-006', 'GEMS Campus',      'GEMS Education Group',    180000,  9000,  189000,  CURRENT_DATE - 18, CURRENT_DATE + 12, 'cancelled', 'Cancelled — scope change');

-- 10. Expenses — pending, approved, rejected, reimbursed, paid.
INSERT INTO public.expenses (description, project_name, category, amount, date, submitted_by, status, approved_by) VALUES
('Site visit travel',   'Aldar Bridge',     'Travel',      1950.00, CURRENT_DATE - 12, 'Arjun Reddy',         'approved',   'Anjali Sharma'),
('Software licence',    'Emaar Tower',      'Software',    4500.00, CURRENT_DATE - 30, 'Deepa Krishnan',      'reimbursed', 'Vikram Iyer'),
('Client lunch',        'Burjeel Hospital', 'Hospitality',  620.00, CURRENT_DATE - 6,  'Anjali Sharma',       'pending',    NULL),
('Printing & plotting', 'Sobha Riverside',  'Office',       290.00, CURRENT_DATE - 3,  'Karthik Subramaniam', 'pending',    NULL),
('Conference fee',      'GEMS Campus',      'Training',    2200.00, CURRENT_DATE - 22, 'Neha Gupta',          'rejected',   'Anjali Sharma'),
('Taxi fares',          'Marina Walk Retail','Travel',      340.00, CURRENT_DATE - 40, 'Rohit Sharma',        'paid',       'Vikram Iyer');

-- 11. Resource allocations — planned, active, inactive, completed.
INSERT INTO public.resource_allocations (employee_name, project_name, role_on_project, allocation_percent, hours_budgeted, hours_spent, start_date, end_date, status) VALUES
('Arjun Reddy',         'Aldar Bridge',     'Lead QS',           60, 600, 240, CURRENT_DATE - 90,  CURRENT_DATE + 200, 'active'),
('Karthik Subramaniam', 'Aldar Bridge',     'Quantity Surveyor', 80, 800, 360, CURRENT_DATE - 90,  CURRENT_DATE + 200, 'active'),
('Deepa Krishnan',      'Emaar Tower',      'Cost Consultant',   50, 500, 300, CURRENT_DATE - 110, CURRENT_DATE + 150, 'active'),
('Neha Gupta',          'GEMS Campus',      'Cost Support',      40, 300, 90,  CURRENT_DATE - 45,  CURRENT_DATE + 120, 'active'),
('Rohit Sharma',        'Marina Walk Retail','Quantity Surveyor',30, 240, 0,   CURRENT_DATE + 5,   CURRENT_DATE + 180, 'planned'),
('Deepa Krishnan',      'Heritage Museum',  'Cost Consultant',   25, 200, 200, CURRENT_DATE - 320, CURRENT_DATE - 30,  'completed'),
('Karthik Subramaniam', 'Old Souk Refurb',  'Quantity Surveyor', 20, 160, 160, CURRENT_DATE - 500, CURRENT_DATE - 60,  'inactive');

-- 12. Milestones — pending, in_progress, completed, overdue.
INSERT INTO public.milestones (title, project_name, phase, riba_stage, due_date, assigned_to, description, status, completed_date) VALUES
('Kick-off meeting',        'Marina Walk Retail','kick_off',         'stage_1', CURRENT_DATE + 3,  'Karthik Subramaniam', 'Project initiation.',        'in_progress', NULL),
('Stage 3 design freeze',   'Burjeel Hospital',  'design',           'stage_3', CURRENT_DATE + 15, 'Anjali Sharma',       'Freeze design for costing.', 'pending',     NULL),
('Tender issue',            'Emaar Tower',       'pre_construction', 'stage_4', CURRENT_DATE - 4,  'Arjun Reddy',         'Issue tender package.',      'overdue',     NULL),
('Cost plan sign-off',      'GEMS Campus',       'feasibility',      'stage_2', CURRENT_DATE - 12, 'Deepa Krishnan',      'Client sign-off.',           'completed',   CURRENT_DATE - 14),
('Final account agreed',    'Heritage Museum',   'post_completion',  'stage_6', CURRENT_DATE - 25, 'Deepa Krishnan',      'Agree final account.',       'completed',   CURRENT_DATE - 28),
('Practical completion',    'Sobha Riverside',   'construction',     'stage_5', CURRENT_DATE + 40, 'Arjun Reddy',         'PC inspection.',             'pending',     NULL);

-- 13. Performance reviews — previous + current quarter, ratings variety.
WITH pq AS (
  SELECT to_char(CURRENT_DATE - INTERVAL '3 months','YYYY')||' Q'||EXTRACT(quarter FROM CURRENT_DATE - INTERVAL '3 months') AS label,
         date_trunc('quarter', CURRENT_DATE - INTERVAL '3 months')::date AS pstart,
         (date_trunc('quarter', CURRENT_DATE - INTERVAL '3 months') + INTERVAL '3 months - 1 day')::date AS pend
)
INSERT INTO public.performance_reviews
  (employee_id, employee_name, period_label, period_start, period_end, utilisation, billable_hours, non_billable_hours, revenue, kpi_score, rating, comments, objectives, reviewed_by)
SELECT emp.id, emp.full_name, pq.label, pq.pstart, pq.pend, v.util, v.bill, v.nonbill, v.rev, v.score, v.rating, v.comments, v.obj, v.reviewer
FROM pq, (VALUES
  ('Arjun Reddy',         92, 430, 50,  240800, 94, 'exceptional',          'Outstanding quarter; won Aldar bridge.',     'Lead bid strategy next quarter.',  'Anjali Sharma'),
  ('Deepa Krishnan',      85, 400, 70,  216000, 86, 'exceeds_expectations', 'Strong cost-management delivery.',           'Mentor Neha.',                     'Anjali Sharma'),
  ('Karthik Subramaniam', 74, 330, 130, 141900, 75, 'meets_expectations',   'Developing well; good BoQ output.',          'Improve utilisation toward 80%.',  'Arjun Reddy'),
  ('Neha Gupta',          61, 240, 150, 76800,  58, 'needs_improvement',    'Utilisation below target; coaching needed.', 'Hit 70% utilisation.',             'Deepa Krishnan'),
  ('Sanjay Patel',        80, 360, 90,  129600, 82, 'exceeds_expectations', 'Reliable finance support.',                  'Own monthly reporting.',           'Vikram Iyer'),
  ('Rohit Sharma',        48, 180, 200, 76500,  45, 'unsatisfactory',       'Significant underperformance this period.',  'Performance plan in place.',       'Arjun Reddy')
) AS v(name, util, bill, nonbill, rev, score, rating, comments, obj, reviewer)
JOIN public.employees emp ON emp.full_name = v.name;

COMMIT;
