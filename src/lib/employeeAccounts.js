import { supabase } from '@/lib/supabase';

export const DEFAULT_EMPLOYEE_PASSWORD = 'Qmetrix@123';

/**
 * When an edge function replies with a non-2xx status, supabase-js throws a
 * generic "Edge Function returned a non-2xx status code" and hangs the actual
 * response off `error.context`. The function always answers with
 * `{ success: false, error: "<reason>" }`, so read that instead — otherwise HR
 * is shown an opaque message with nothing to act on.
 */
async function readFunctionError(error) {
  const response = error?.context;
  if (!response || typeof response.json !== 'function') return null;
  try {
    const body = await response.clone().json();
    return body?.error || null;
  } catch {
    try {
      const text = await response.clone().text();
      return text?.trim() || null;
    } catch {
      return null;
    }
  }
}

export async function provisionEmployeeAccount({
  employeeId,
  email,
  fullName,
  appRole,
}) {
  const { data, error } = await supabase.functions.invoke('create-employee-account', {
    body: {
      employeeId,
      email,
      fullName,
      appRole,
    },
  });

  if (error) {
    if (error.status === 404) {
      throw new Error(
        'Supabase edge function "create-employee-account" was not found. Deploy the function or verify the function name in the Supabase project.'
      );
    }
    const reason = await readFunctionError(error);
    throw new Error(reason || error.message || 'Failed to create employee login account.');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to create employee login account.');
  }

  return data;
}
