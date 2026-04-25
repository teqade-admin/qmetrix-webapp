// Run this in the browser console while signed in to bootstrap the current user as admin.

async function createDefaultAdmin() {
  const client = window.supabase || window.SupabaseClient;

  if (!client) {
    console.error('Supabase client not found. Open the app first, then run this script from the browser console.');
    return;
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) {
    console.error('Failed to load the current user:', userError.message);
    return;
  }

  if (!userData?.user) {
    console.error('Sign in first, then run createDefaultAdmin().');
    return;
  }

  const { error } = await client.rpc('bootstrap_admin_account', {
    p_full_name: userData.user.user_metadata?.full_name || userData.user.email,
  });

  if (error) {
    console.error('Admin bootstrap failed:', error.message);
    return;
  }

  console.log('Admin setup complete for:', userData.user.email);
}
