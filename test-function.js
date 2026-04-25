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
  envVars.VITE_SUPABASE_ANON_KEY
);

// Test the create-employee-account function
async function testEmployeeAccountCreation() {
  try {
    console.log('Testing employee account creation function...');

    // First, let's check if we can call the function at all
    const { data, error } = await supabase.functions.invoke('create-employee-account', {
      body: {
        employeeId: 'test-id',
        email: 'test@example.com',
        fullName: 'Test User',
        appRole: 'qs',
      },
    });

    if (error) {
      console.error('Function call error:', error);
      return;
    }

    console.log('Function response:', data);
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testEmployeeAccountCreation();