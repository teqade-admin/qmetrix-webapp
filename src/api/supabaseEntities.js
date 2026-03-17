import { supabase } from '@/lib/supabase';

const makeEntity = (tableName) => ({
  list: async (orderBy) => {
    const query = supabase.from(tableName).select('*');
    if (orderBy) {
      const desc = orderBy.startsWith('-');
      const col = orderBy.replace('-', '');
      query.order(col, { ascending: !desc });
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
  create: async (data) => {
    const { data: result, error } = await supabase.from(tableName).insert(data).select().single();
    if (error) throw error;
    return result;
  },
  update: async (id, data) => {
    const { data: result, error } = await supabase.from(tableName).update(data).eq('id', id).select().single();
    if (error) throw error;
    return result;
  },
  delete: async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
  }
});

export const entities = {
  Project: makeEntity('projects'),
  Employee: makeEntity('employees'),
  Timesheet: makeEntity('timesheets'),
  ResourceAllocation: makeEntity('resource_allocations'),
  Invoice: makeEntity('invoices'),
  Expense: makeEntity('expenses'),
  Bid: makeEntity('bids'),
  Milestone: makeEntity('milestones'),
  Deliverable: makeEntity('deliverables'),
};