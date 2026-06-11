import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://czaxlazxaoczhtkafity.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_epTHLjpHFsiodbriCUZ2KA_cX8_-nBf';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const email = 'admin@campaigncopilot.com';
  const password = 'password123';

  console.log(`Trying to sign in as ${email}...`);
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInData?.user) {
    console.log('User already exists and login works!');
    return;
  }

  console.log(`Sign in failed: ${signInError?.message}. Attempting to create user...`);

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    console.error('Error creating user:', signUpError.message);
  } else {
    console.log('User created successfully:', signUpData.user?.email);
    console.log('User ID:', signUpData.user?.id);
    console.log('Is email confirmed:', signUpData.user?.email_confirmed_at != null ? 'Yes' : 'No');
  }
}

main();
