import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables from .env file
const envContent = readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key] = value;
  }
});

const supabase = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY // Use service role key for full access
);

// Entity definitions (simplified versions for testing)
const entities = {
  Employee: {
    create: async (data) => {
      const { data: result, error } = await supabase
        .from('employees')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    list: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*');
      if (error) throw error;
      return data;
    },
    update: async (id, data) => {
      const { data: result, error } = await supabase
        .from('employees')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },
  Project: {
    create: async (data) => {
      const { data: result, error } = await supabase
        .from('projects')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    list: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*');
      if (error) throw error;
      return data;
    },
    update: async (id, data) => {
      const { data: result, error } = await supabase
        .from('projects')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },
  Timesheet: {
    create: async (data) => {
      const { data: result, error } = await supabase
        .from('timesheets')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    list: async () => {
      const { data, error } = await supabase
        .from('timesheets')
        .select('*');
      if (error) throw error;
      return data;
    },
    update: async (id, data) => {
      const { data: result, error } = await supabase
        .from('timesheets')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('timesheets')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },
  Bid: {
    create: async (data) => {
      const { data: result, error } = await supabase
        .from('bids')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    list: async () => {
      const { data, error } = await supabase
        .from('bids')
        .select('*');
      if (error) throw error;
      return data;
    },
    update: async (id, data) => {
      const { data: result, error } = await supabase
        .from('bids')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('bids')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },
  Invoice: {
    create: async (data) => {
      const { data: result, error } = await supabase
        .from('invoices')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    list: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*');
      if (error) throw error;
      return data;
    },
    update: async (id, data) => {
      const { data: result, error } = await supabase
        .from('invoices')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },
  Expense: {
    create: async (data) => {
      const { data: result, error } = await supabase
        .from('expenses')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    list: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*');
      if (error) throw error;
      return data;
    },
    update: async (id, data) => {
      const { data: result, error } = await supabase
        .from('expenses')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },
  Deliverable: {
    create: async (data) => {
      const { data: result, error } = await supabase
        .from('deliverables')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    list: async () => {
      const { data, error } = await supabase
        .from('deliverables')
        .select('*');
      if (error) throw error;
      return data;
    },
    update: async (id, data) => {
      const { data: result, error } = await supabase
        .from('deliverables')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('deliverables')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },
  Milestone: {
    create: async (data) => {
      const { data: result, error } = await supabase
        .from('milestones')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    list: async () => {
      const { data, error } = await supabase
        .from('milestones')
        .select('*');
      if (error) throw error;
      return data;
    },
    update: async (id, data) => {
      const { data: result, error } = await supabase
        .from('milestones')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('milestones')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },
  ResourceAllocation: {
    create: async (data) => {
      const { data: result, error } = await supabase
        .from('resource_allocations')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    list: async () => {
      const { data, error } = await supabase
        .from('resource_allocations')
        .select('*');
      if (error) throw error;
      return data;
    },
    update: async (id, data) => {
      const { data: result, error } = await supabase
        .from('resource_allocations')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('resource_allocations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },
  LeaveRequest: {
    create: async (data) => {
      const { data: result, error } = await supabase
        .from('leave_requests')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    list: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*');
      if (error) throw error;
      return data;
    },
    update: async (id, data) => {
      const { data: result, error } = await supabase
        .from('leave_requests')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  }
};

const testResults = {
  passed: [],
  failed: [],
};

const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
};

const testCRUD = async (entityName, entity, testData) => {
  log(`Testing ${entityName} CRUD operations...`);

  try {
    // Test CREATE
    log(`Creating ${entityName}...`);
    const created = await entity.create(testData.create);
    log(`${entityName} created successfully with ID: ${created.id}`, 'success');

    // Test READ (list)
    log(`Listing ${entityName}...`);
    const list = await entity.list();
    const found = list.find(item => item.id === created.id);
    if (!found) throw new Error(`${entityName} not found in list after creation`);
    log(`${entityName} list/read successful`, 'success');

    // Test UPDATE
    if (testData.update) {
      log(`Updating ${entityName}...`);
      const updated = await entity.update(created.id, testData.update);
      log(`${entityName} updated successfully`, 'success');
    }

    // Test DELETE
    log(`Deleting ${entityName}...`);
    await entity.delete(created.id);
    log(`${entityName} deleted successfully`, 'success');

    testResults.passed.push(entityName);
    log(`${entityName} CRUD test PASSED`, 'success');

  } catch (error) {
    testResults.failed.push({ entity: entityName, error: error.message });
    log(`${entityName} CRUD test FAILED: ${error.message}`, 'error');
  }
};

const runComprehensiveCRUDTests = async () => {
  log('Starting comprehensive CRUD tests...');

  const testData = {
    Employee: {
      create: {
        full_name: 'Test Employee',
        email: 'test.employee@example.com',
        department: 'cost_management',
        role: 'consultant',
        app_role: 'qs',
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
      },
      update: {
        department: 'quantity_surveying',
      },
    },
    Project: {
      create: {
        name: 'Test Project',
        client_name: 'Test Client',
        sector: 'commercial',
        status: 'kick_off',
        riba_stage: 'stage_0',
      },
      update: {
        status: 'feasibility',
      },
    },
    Timesheet: {
      create: {
        employee_name: 'Test Employee',
        project_name: 'Test Project',
        date: new Date().toISOString().split('T')[0],
        hours: 8,
        task_description: 'Test task',
        billable: true,
        status: 'draft',
        week_ending: new Date().toISOString().split('T')[0],
      },
      update: {
        status: 'submitted',
      },
    },
    Bid: {
      create: {
        title: 'Test Bid',
        client_name: 'Test Client',
        sector: 'commercial',
        status: 'draft',
        lead_consultant: 'Test Employee',
      },
      update: {
        status: 'in_progress',
      },
    },
    Invoice: {
      create: {
        invoice_number: 'TEST-001',
        client_name: 'Test Client',
        amount: 1000,
        status: 'draft',
      },
      update: {
        status: 'sent',
      },
    },
    Expense: {
      create: {
        description: 'Test expense',
        amount: 100,
        date: new Date().toISOString().split('T')[0],
        submitted_by: 'Test Employee',
        status: 'pending',
      },
      update: {
        status: 'approved',
      },
    },
    Deliverable: {
      create: {
        title: 'Test Deliverable',
        project_name: 'Test Project',
        riba_stage: 'stage_0',
        deliverable_type: 'cost_plan',
        overall_status: 'not_started',
        version: 'v1.0',
      },
      update: {
        overall_status: 'in_progress',
      },
    },
    Milestone: {
      create: {
        title: 'Test Milestone',
        project_name: 'Test Project',
        phase: 'kick_off',
        riba_stage: 'stage_0',
        status: 'pending',
      },
      update: {
        status: 'completed',
      },
    },
    ResourceAllocation: {
      create: {
        employee_name: 'Test Employee',
        project_name: 'Test Project',
        role_on_project: 'Consultant',
        allocation_percent: 50,
        status: 'active',
      },
      update: {
        allocation_percent: 75,
      },
    },
    LeaveRequest: {
      create: {
        employee_name: 'Test Employee',
        leave_type: 'annual',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
        days_requested: 1,
        status: 'pending',
      },
      update: {
        status: 'approved',
      },
    },
  };

  // Test all entities
  for (const [entityName, data] of Object.entries(testData)) {
    await testCRUD(entityName, entities[entityName], data);
  }

  // Summary
  log(`\n=== TEST SUMMARY ===`);
  log(`PASSED: ${testResults.passed.length}`);
  log(`FAILED: ${testResults.failed.length}`);

  if (testResults.failed.length > 0) {
    log(`\nFAILED TESTS:`);
    testResults.failed.forEach(failure => {
      log(`- ${failure.entity}: ${failure.error}`);
    });
  }

  return testResults;
};

// Run the tests
runComprehensiveCRUDTests().then(results => {
  console.log('All tests completed. Results:', results);
  process.exit(results.failed.length > 0 ? 1 : 0);
}).catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});