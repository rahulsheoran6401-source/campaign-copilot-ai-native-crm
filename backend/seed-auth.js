import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function seedUser() {
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@campaigncopilot.com',
    password: 'password123',
  });
  if (error) console.error('Error creating admin user:', error.message);
  else console.log('Admin user created successfully:', data.user?.id);
}

seedUser();
