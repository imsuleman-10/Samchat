import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://euswgfmjlpqyyibksesu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3dnZm1qbHBxeXlpYmtzZXN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTgzNDQ2MCwiZXhwIjoyMTA1NDEwNDYwfQ.Vr-Ac7WyPyY92RLtAZIbxcr_sNqAQ8MfPCKI578lhzE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdmin() {
  const email = 'samstacktechs@gmail.com';
  const password = 'Salman123@';
  
  console.log(`Checking if admin ${email} exists...`);
  
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }
  
  const existingAdmin = users.users.find(u => u.email === email);
  
  if (!existingAdmin) {
    console.log('Creating admin user...');
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Admin' }
    });
    
    if (error) {
      console.error('Error creating admin:', error);
      return;
    }
    
    console.log('Admin user created in auth! ID:', data.user.id);
    
    // Add to public.users
    const { error: dbError } = await supabase.from('users').upsert({
      id: data.user.id,
      email: data.user.email,
      name: 'Admin'
    });
    
    if (dbError) {
      console.error('Error creating public profile:', dbError);
    } else {
      console.log('Admin public profile created!');
    }
  } else {
    console.log('Admin user already exists.');
    
    // Ensure public profile exists
    const { error: dbError } = await supabase.from('users').upsert({
      id: existingAdmin.id,
      email: existingAdmin.email,
      name: 'Admin'
    });
    if (!dbError) console.log('Ensured public profile for existing admin.');
  }
}

createAdmin();
