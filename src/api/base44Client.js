import { supabase } from '@/lib/supabase';
import { entities } from '@/api/supabaseEntities';

// Drop-in replacement for base44 — all pages work without changes
export const base44 = {
  entities,
  auth: {
    me: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    logout: () => supabase.auth.signOut(),
    redirectToLogin: () => { window.location.href = '/login'; }
  }
};