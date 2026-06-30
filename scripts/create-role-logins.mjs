/**
 * Creates one login per system role, matching the seeded UAE/AED demo employees.
 * The app resolves a user's role from the matching employee.app_role (by email),
 * so logging in as one of these emails gives you that role.
 *
 * Prereqs: run supabase_seed.sql first (so the employees exist).
 * Usage:   node scripts/create-role-logins.mjs
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env (service role required).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// --- tiny .env loader ---
const __dirname = dirname(fileURLToPath(import.meta.url));
const env = { ...process.env };
try {
  for (const line of readFileSync(join(__dirname, '..', '.env'), 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* no .env; rely on process.env */ }

const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = env.DEMO_LOGIN_PASSWORD || 'Qmetrix@123';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// One representative employee per role (must match the seeded emails).
const ACCOUNTS = [
  { role: 'Super Admin',   email: 'rajesh.menon@qmetrix.ae',  fullName: 'Rajesh Menon' },
  { role: 'Ops Admin',     email: 'anjali.sharma@qmetrix.ae', fullName: 'Anjali Sharma' },
  { role: 'Finance Admin', email: 'vikram.iyer@qmetrix.ae',   fullName: 'Vikram Iyer' },
  { role: 'HR Admin',      email: 'priya.nair@qmetrix.ae',    fullName: 'Priya Nair' },
  { role: 'Ops User',      email: 'arjun.reddy@qmetrix.ae',   fullName: 'Arjun Reddy' },
  { role: 'Finance User',  email: 'sanjay.patel@qmetrix.ae',  fullName: 'Sanjay Patel' },
  { role: 'HR User',       email: 'meera.joshi@qmetrix.ae',   fullName: 'Meera Joshi' },
];

async function findUserByEmail(email) {
  // listUsers is paginated; scan a few pages.
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

async function run() {
  console.log(`Creating ${ACCOUNTS.length} role logins (password: ${PASSWORD})\n`);
  for (const a of ACCOUNTS) {
    try {
      let user = await findUserByEmail(a.email);
      if (user) {
        await admin.auth.admin.updateUserById(user.id, {
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { ...(user.user_metadata || {}), full_name: a.fullName },
        });
      } else {
        const { data, error } = await admin.auth.admin.createUser({
          email: a.email,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: a.fullName },
        });
        if (error) throw error;
        user = data.user;
      }

      await admin.from('users').upsert({ id: user.id, email: a.email, full_name: a.fullName });
      await admin.from('employees').update({ user_id: user.id }).eq('email', a.email);

      console.log(`  ✓ ${a.role.padEnd(14)} ${a.email}`);
    } catch (e) {
      console.error(`  ✗ ${a.role.padEnd(14)} ${a.email}  — ${e.message}`);
    }
  }
  console.log(`\nDone. Sign in with any email above and password "${PASSWORD}".`);
}

run();
