const isoDate = (date = new Date()) => date.toISOString().split('T')[0];

const logResult = (reporter, result) => {
  if (typeof reporter === 'function') {
    reporter({
      ...result,
      timestamp: new Date(),
    });
  }
};

const createStep = async ({ name, reporter, run }) => {
  logResult(reporter, { test: name, success: false, message: `Running ${name}...`, pending: true });

  try {
    const data = await run();
    logResult(reporter, { test: name, success: true, message: `${name} passed` });
    return data;
  } catch (error) {
    logResult(reporter, {
      test: name,
      success: false,
      message: `${name} failed`,
      error: error.message,
    });
    throw error;
  }
};

export async function runIntegrationTestSuite({
  supabase,
  reporter,
  uploadFile,
  currentUser,
}) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const recordsToDelete = [];

  const trackRecord = (table, id) => {
    recordsToDelete.unshift({ table, id });
  };

  let uploadedFile = null;
  let userProfile = null;
  let employee = null;
  let leaveRequest = null;
  let project = null;

  try {
    userProfile = await createStep({
      name: 'Users Profile',
      reporter,
      run: async () => {
        const payload = {
          id: currentUser.id,
          email: currentUser.email,
          full_name: currentUser.user_metadata?.full_name || `Integration ${suffix}`,
        };

        const { data: existingProfile, error: selectError } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (selectError) throw selectError;

        const query = existingProfile
          ? supabase.from('users').update({ full_name: payload.full_name }).eq('id', currentUser.id)
          : supabase.from('users').insert(payload);

        const { error } = await query;

        if (error) throw error;

        const { data, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (fetchError) throw fetchError;
        return data;
      },
    });

    employee = await createStep({
      name: 'Employees CRUD',
      reporter,
      run: async () => {
        const insertPayload = {
          user_id: currentUser.id,
          full_name: `Integration Employee ${suffix}`,
          email: `employee-${suffix}@example.com`,
          department: 'cost_management',
          role: 'consultant',
          app_role: 'qs',
          status: 'active',
          start_date: isoDate(),
        };

        const { data: created, error: createError } = await supabase
          .from('employees')
          .insert(insertPayload)
          .select()
          .single();
        if (createError) throw createError;
        trackRecord('employees', created.id);

        const { data: updated, error: updateError } = await supabase
          .from('employees')
          .update({ full_name: `${insertPayload.full_name} Updated` })
          .eq('id', created.id)
          .select()
          .single();
        if (updateError) throw updateError;

        return updated;
      },
    });

    leaveRequest = await createStep({
      name: 'Leave Requests CRUD',
      reporter,
      run: async () => {
        const { data: created, error: createError } = await supabase
          .from('leave_requests')
          .insert({
            employee_id: employee.id,
            employee_name: employee.full_name,
            leave_type: 'annual',
            start_date: isoDate(),
            end_date: isoDate(),
            days_requested: 1,
            status: 'pending',
          })
          .select()
          .single();
        if (createError) throw createError;
        trackRecord('leave_requests', created.id);

        const { data: updated, error: updateError } = await supabase
          .from('leave_requests')
          .update({ status: 'approved' })
          .eq('id', created.id)
          .select()
          .single();
        if (updateError) throw updateError;

        return updated;
      },
    });

    project = await createStep({
      name: 'Projects CRUD',
      reporter,
      run: async () => {
        const { data: created, error: createError } = await supabase
          .from('projects')
          .insert({
            name: `Integration Project ${suffix}`,
            project_code: `P-${suffix}`,
            client_name: 'Integration Client',
            description: 'Integration test project',
            sector: 'commercial',
            status: 'kick_off',
            riba_stage: 'stage_1',
          })
          .select()
          .single();
        if (createError) throw createError;
        trackRecord('projects', created.id);

        const { data: updated, error: updateError } = await supabase
          .from('projects')
          .update({ description: 'Integration project updated' })
          .eq('id', created.id)
          .select()
          .single();
        if (updateError) throw updateError;

        return updated;
      },
    });

    await createStep({
      name: 'Timesheets CRUD',
      reporter,
      run: async () => {
        const { data: created, error: createError } = await supabase
          .from('timesheets')
          .insert({
            employee_name: employee.full_name,
            project_name: project.name,
            date: isoDate(),
            hours: 8,
            task_description: 'Integration task',
            billable: true,
            status: 'draft',
            week_ending: isoDate(),
          })
          .select()
          .single();
        if (createError) throw createError;
        trackRecord('timesheets', created.id);

        const { error: updateError } = await supabase
          .from('timesheets')
          .update({ status: 'submitted' })
          .eq('id', created.id);
        if (updateError) throw updateError;

        return created;
      },
    });

    await createStep({
      name: 'Resource Allocations CRUD',
      reporter,
      run: async () => {
        const { data: created, error: createError } = await supabase
          .from('resource_allocations')
          .insert({
            employee_name: employee.full_name,
            project_name: project.name,
            role_on_project: 'Consultant',
            allocation_percent: 75,
            hours_budgeted: 120,
            hours_spent: 16,
            start_date: isoDate(),
            end_date: isoDate(),
            status: 'planned',
          })
          .select()
          .single();
        if (createError) throw createError;
        trackRecord('resource_allocations', created.id);

        const { error: updateError } = await supabase
          .from('resource_allocations')
          .update({ status: 'active' })
          .eq('id', created.id);
        if (updateError) throw updateError;

        return created;
      },
    });

    const bid = await createStep({
      name: 'Bids CRUD',
      reporter,
      run: async () => {
        const { data: created, error: createError } = await supabase
          .from('bids')
          .insert({
            title: `Integration Bid ${suffix}`,
            client_name: 'Integration Client',
            description: 'Integration bid',
            sector: 'commercial',
            status: 'draft',
            lead_consultant: employee.full_name,
          })
          .select()
          .single();
        if (createError) throw createError;
        trackRecord('bids', created.id);

        const { data: updated, error: updateError } = await supabase
          .from('bids')
          .update({ status: 'won', client_onboarding_status: 'completed' })
          .eq('id', created.id)
          .select()
          .single();
        if (updateError) throw updateError;

        return updated;
      },
    });

    await createStep({
      name: 'Invoices CRUD',
      reporter,
      run: async () => {
        const { data: created, error: createError } = await supabase
          .from('invoices')
          .insert({
            invoice_number: `INV-${suffix}`,
            project_name: project.name,
            client_name: bid.client_name,
            amount: 1000,
            tax_amount: 200,
            total_amount: 1200,
            issue_date: isoDate(),
            due_date: isoDate(),
            status: 'draft',
          })
          .select()
          .single();
        if (createError) throw createError;
        trackRecord('invoices', created.id);

        const { error: updateError } = await supabase
          .from('invoices')
          .update({ status: 'sent' })
          .eq('id', created.id);
        if (updateError) throw updateError;

        return created;
      },
    });

    await createStep({
      name: 'Expenses CRUD',
      reporter,
      run: async () => {
        const { data: created, error: createError } = await supabase
          .from('expenses')
          .insert({
            description: 'Integration expense',
            project_name: project.name,
            category: 'software',
            amount: 250,
            date: isoDate(),
            submitted_by: employee.full_name,
            status: 'pending',
          })
          .select()
          .single();
        if (createError) throw createError;
        trackRecord('expenses', created.id);

        const { error: updateError } = await supabase
          .from('expenses')
          .update({ status: 'approved' })
          .eq('id', created.id);
        if (updateError) throw updateError;

        return created;
      },
    });

    await createStep({
      name: 'Deliverables CRUD',
      reporter,
      run: async () => {
        const { data: created, error: createError } = await supabase
          .from('deliverables')
          .insert({
            title: `Integration Deliverable ${suffix}`,
            project_name: project.name,
            riba_stage: 'stage_2',
            deliverable_type: 'cost_plan',
            due_date: isoDate(),
            originator: employee.full_name,
            checker: employee.full_name,
            reviewer: employee.full_name,
            authoriser: employee.full_name,
            overall_status: 'in_progress',
            version: 'v1.0',
          })
          .select()
          .single();
        if (createError) throw createError;
        trackRecord('deliverables', created.id);

        const { error: updateError } = await supabase
          .from('deliverables')
          .update({ overall_status: 'under_review', checker_status: 'approved' })
          .eq('id', created.id);
        if (updateError) throw updateError;

        return created;
      },
    });

    await createStep({
      name: 'Milestones CRUD',
      reporter,
      run: async () => {
        const { data: created, error: createError } = await supabase
          .from('milestones')
          .insert({
            title: `Integration Milestone ${suffix}`,
            project_name: project.name,
            phase: 'design',
            riba_stage: 'stage_2',
            due_date: isoDate(),
            assigned_to: employee.full_name,
            description: 'Integration milestone',
            status: 'pending',
          })
          .select()
          .single();
        if (createError) throw createError;
        trackRecord('milestones', created.id);

        const { error: updateError } = await supabase
          .from('milestones')
          .update({ status: 'completed', completed_date: isoDate() })
          .eq('id', created.id);
        if (updateError) throw updateError;

        return created;
      },
    });

    await createStep({
      name: 'Documents CRUD',
      reporter,
      run: async () => {
        const documentPayload = {
          title: `Integration Document ${suffix}`,
          project_name: project.name,
          category: 'report',
          folder: 'Projects',
          version: 'v1.0',
          tags: ['integration'],
          uploaded_by: employee.full_name,
        };

        if (typeof uploadFile === 'function') {
          uploadedFile = await uploadFile({
            fileName: `integration-${suffix}.txt`,
            fileContents: `integration document ${suffix}`,
          });
          documentPayload.file_url = uploadedFile.file_url;
        }

        const { data: created, error: createError } = await supabase
          .from('documents')
          .insert(documentPayload)
          .select()
          .single();
        if (createError) throw createError;
        trackRecord('documents', created.id);

        const { error: updateError } = await supabase
          .from('documents')
          .update({ version: 'v1.1' })
          .eq('id', created.id);
        if (updateError) throw updateError;

        return created;
      },
    });

    await createStep({
      name: 'Role Lookup',
      reporter,
      run: async () => {
        const { error } = await supabase
          .from('user_roles')
          .select('id, roles(name)')
          .eq('user_id', currentUser.id);

        if (error) throw error;
        return userProfile;
      },
    });
  } finally {
    for (const record of recordsToDelete) {
      const { error } = await supabase.from(record.table).delete().eq('id', record.id);
      if (error) {
        logResult(reporter, {
          test: `Cleanup ${record.table}`,
          success: false,
          message: `Cleanup failed for ${record.table}`,
          error: error.message,
        });
      }
    }
  }

  return {
    currentUser,
    employee,
    leaveRequest,
    project,
    uploadedFile,
  };
}
