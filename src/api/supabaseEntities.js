import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/error-utils';

const ORDER_COLUMN_ALIASES = {
  created_date: 'created_at',
  updated_date: 'updated_at',
};

const normalizeOrderBy = (orderBy) => {
  if (!orderBy) return null;

  const desc = orderBy.startsWith('-');
  const column = orderBy.replace(/^-/, '');
  const normalizedColumn = ORDER_COLUMN_ALIASES[column] || column;

  return {
    ascending: !desc,
    column: normalizedColumn,
  };
};

const normalizeRecord = (record) => {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return record;
  }

  return {
    ...record,
    created_date: record.created_date ?? record.created_at ?? null,
    updated_date: record.updated_date ?? record.updated_at ?? null,
  };
};

const READ_ONLY_COLUMNS = new Set([
  'id',
  'created_at',
  'updated_at',
  'created_date',
  'updated_date',
]);

const sanitizeWritePayload = (data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data;
  }

  return Object.fromEntries(
    Object.entries(data).filter(([key, value]) => (
      !READ_ONLY_COLUMNS.has(key) && value !== undefined
    ))
  );
};

const throwEntityError = (error, tableName, operation) => {
  const message = getErrorMessage(error, `${operation} failed for ${tableName}.`);
  throw new Error(`${operation} failed for ${tableName}: ${message}`);
};

const makeEntity = (tableName) => ({
  list: async (orderBy) => {
    const query = supabase.from(tableName).select('*');
    const normalizedOrderBy = normalizeOrderBy(orderBy);

    if (normalizedOrderBy) {
      query.order(normalizedOrderBy.column, { ascending: normalizedOrderBy.ascending });
    }

    const { data, error } = await query;
    if (error) throwEntityError(error, tableName, 'List');
    return (data || []).map(normalizeRecord);
  },
  create: async (data) => {
    const { data: result, error } = await supabase.from(tableName).insert(sanitizeWritePayload(data)).select().single();
    if (error) throwEntityError(error, tableName, 'Create');
    return normalizeRecord(result);
  },
  update: async (id, data) => {
    const { data: result, error } = await supabase.from(tableName).update(sanitizeWritePayload(data)).eq('id', id).select().single();
    if (error) throwEntityError(error, tableName, 'Update');
    return normalizeRecord(result);
  },
  delete: async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throwEntityError(error, tableName, 'Delete');
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
  Document: makeEntity('documents'),
  LeaveRequest: makeEntity('leave_requests'),
};
