import { createClient } from '@supabase/supabase-js';
import { runIntegrationTestSuite } from '../src/lib/integrationTestSuite.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const storageBucket = process.env.VITE_SUPABASE_STORAGE_BUCKET || 'documents';

if (!supabaseUrl || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in the environment.');
}

const adminClient = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

const authClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const createdUserIds = [];

const createOrSignInTestUser = async () => {
  const configuredEmail = process.env.SUPABASE_TEST_EMAIL;
  const configuredPassword = process.env.SUPABASE_TEST_PASSWORD;

  if (configuredEmail && configuredPassword) {
    if (adminClient) {
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((user) => user.email === configuredEmail);

      if (!existingUser) {
        const { data, error } = await adminClient.auth.admin.createUser({
          email: configuredEmail,
          password: configuredPassword,
          email_confirm: true,
          user_metadata: { full_name: 'Integration Test User' },
        });
        if (error) throw error;
        createdUserIds.push(data.user.id);
      }
    }

    const { data, error } = await authClient.auth.signInWithPassword({
      email: configuredEmail,
      password: configuredPassword,
    });
    if (error) throw error;
    return data.user;
  }

  const email = `integration-${Date.now()}@example.com`;
  const password = `Test!${Math.random().toString(36).slice(2, 12)}A1`;

  if (adminClient) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Integration Test User' },
    });
    if (error) throw error;
    createdUserIds.push(data.user.id);

    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw signInError;
    return signInData.user;
  }

  const { data: signUpData, error: signUpError } = await authClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Integration Test User',
      },
    },
  });
  if (signUpError) throw signUpError;

  if (signUpData.user && signUpData.session) {
    return signUpData.user;
  }

  const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    throw new Error(
      'Could not obtain an authenticated test session. Provide SUPABASE_TEST_EMAIL/SUPABASE_TEST_PASSWORD for a confirmed user or SUPABASE_SERVICE_ROLE_KEY so the script can create one.'
    );
  }

  return signInData.user;
};

const uploadFile = async ({ fileName, fileContents }) => {
  const filePath = `integration-tests/${Date.now()}-${fileName}`;
  const fileBuffer = Buffer.from(fileContents, 'utf8');

  const { error: uploadError } = await authClient.storage
    .from(storageBucket)
    .upload(filePath, fileBuffer, {
      contentType: 'text/plain',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      `Storage upload failed for bucket "${storageBucket}". ${uploadError.message}`
    );
  }

  const { data } = authClient.storage.from(storageBucket).getPublicUrl(filePath);

  return {
    bucket: storageBucket,
    file_path: filePath,
    file_url: data.publicUrl,
  };
};

const reporter = ({ test, success, message, error, pending }) => {
  const prefix = pending ? '[RUN ]' : success ? '[PASS]' : '[FAIL]';
  const line = `${prefix} ${test}: ${message}`;
  process.stdout.write(`${line}\n`);
  if (error) {
    process.stdout.write(`       ${error}\n`);
  }
};

try {
  const currentUser = await createOrSignInTestUser();

  const integrationResult = await runIntegrationTestSuite({
    supabase: authClient,
    currentUser,
    reporter,
    uploadFile,
  });

  if (integrationResult.uploadedFile?.file_path) {
    const { error } = await authClient.storage
      .from(integrationResult.uploadedFile.bucket || storageBucket)
      .remove([integrationResult.uploadedFile.file_path]);

    if (error) {
      process.stdout.write(`Cleanup warning: failed to delete uploaded test file ${integrationResult.uploadedFile.file_path}: ${error.message}\n`);
    }
  }

  process.stdout.write('\nIntegration suite completed successfully.\n');
} finally {
  if (adminClient && createdUserIds.length > 0) {
    for (const userId of createdUserIds) {
      const { error: profileDeleteError } = await adminClient
        .from('users')
        .delete()
        .eq('id', userId);

      if (profileDeleteError) {
        process.stdout.write(`Cleanup warning: failed to delete public user profile ${userId}: ${profileDeleteError.message}\n`);
      }

      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) {
        process.stdout.write(`Cleanup warning: failed to delete auth user ${userId}: ${error.message}\n`);
      }
    }
  }
}
