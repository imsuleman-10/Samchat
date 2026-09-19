import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  const targetEmail = 'saqibjaved56033@gmail.com';
  const user = users.find(u => u.email === targetEmail);
  
  if (user) {
    console.log(`Found user: ${user.id}. Deleting...`);
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    console.log('Deleted successfully. They can now sign up again.');
  } else {
    console.log('User not found.');
  }
}
run();
