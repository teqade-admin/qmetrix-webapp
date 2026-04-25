import { supabase } from '@/lib/supabase';

export const DEFAULT_EMPLOYEE_PASSWORD = 'Qmetrix@123';

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
    throw new Error(error.message || 'Failed to create employee login account.');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to create employee login account.');
  }

  return data;
}
