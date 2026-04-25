import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getCorsHeaders = (req: Request) => ({
  ...corsHeaders,
  'Access-Control-Allow-Headers':
    req.headers.get('Access-Control-Request-Headers') ||
    corsHeaders['Access-Control-Allow-Headers'],
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: getCorsHeaders(req),
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse(
        { success: false, error: 'Missing function environment configuration.' },
        500
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Missing authorization header.' }, 401);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      return jsonResponse({ success: false, error: 'Unauthorized caller.' }, 401);
    }

    const { data: roleRows, error: rolesError } = await adminClient
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', caller.id);

    if (rolesError) {
      return jsonResponse({ success: false, error: rolesError.message }, 500);
    }

    const callerRoles = (roleRows || [])
      .map((row: { roles?: { name?: string } | Array<{ name?: string }> }) => {
        if (Array.isArray(row.roles)) return row.roles[0]?.name;
        return row.roles?.name;
      })
      .filter(Boolean);

    if (!callerRoles.some((role) => role === 'admin' || role === 'hr')) {
      return jsonResponse({ success: false, error: 'Only admin or HR users can create employee accounts.' }, 403);
    }

    const { employeeId, email, fullName, appRole } = await req.json();

    if (!employeeId || !email || !fullName) {
      return jsonResponse({ success: false, error: 'employeeId, email, and fullName are required.' }, 400);
    }

    const defaultPassword = 'Qmetrix@123';

    let authUserId: string | null = null;

    const { data: existingUsers, error: listUsersError } = await adminClient.auth.admin.listUsers();
    if (listUsersError) {
      return jsonResponse({ success: false, error: listUsersError.message }, 500);
    }

    const existingUser = existingUsers.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      authUserId = existingUser.id;

      const { error: updateUserError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
        password: defaultPassword,
        email_confirm: true,
        user_metadata: {
          ...(existingUser.user_metadata || {}),
          full_name: fullName,
          temporary_password: true,
        },
      });

      if (updateUserError) {
        return jsonResponse({ success: false, error: updateUserError.message }, 500);
      }
    } else {
      const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
        email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          temporary_password: true,
        },
      });

      if (createUserError || !createdUser.user) {
        return jsonResponse({ success: false, error: createUserError?.message || 'Failed to create auth user.' }, 500);
      }

      authUserId = createdUser.user.id;
    }

    const { error: userUpsertError } = await adminClient
      .from('users')
      .upsert({
        id: authUserId,
        email,
        full_name: fullName,
      });

    if (userUpsertError) {
      return jsonResponse({ success: false, error: userUpsertError.message }, 500);
    }

    const { error: employeeUpdateError } = await adminClient
      .from('employees')
      .update({ user_id: authUserId })
      .eq('id', employeeId);

    if (employeeUpdateError) {
      return jsonResponse({ success: false, error: employeeUpdateError.message }, 500);
    }

    if (appRole) {
      const { data: roleData, error: roleLookupError } = await adminClient
        .from('roles')
        .select('id')
        .eq('name', appRole)
        .maybeSingle();

      if (roleLookupError) {
        return jsonResponse({ success: false, error: roleLookupError.message }, 500);
      }

      if (roleData?.id) {
        const { error: roleAssignError } = await adminClient
          .from('user_roles')
          .upsert({
            user_id: authUserId,
            role_id: roleData.id,
            assigned_by: caller.id,
          }, {
            onConflict: 'user_id,role_id',
          });

        if (roleAssignError) {
          return jsonResponse({ success: false, error: roleAssignError.message }, 500);
        }
      }
    }

    return jsonResponse({
      success: true,
      employeeId,
      userId: authUserId,
      email,
      temporaryPassword: defaultPassword,
    });
  } catch (error) {
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : 'Unexpected function failure.' },
      500
    );
  }
});
