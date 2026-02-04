
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', supabaseUrl);
console.log('Service Role Key Present:', !!serviceRoleKey);

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkCategories() {
    console.log('\n--- Checking Categories (Server Role) ---');
    const { data, error } = await supabase.from('categories').select('id, name, icon');

    if (error) {
        console.error('Error fetching categories:', JSON.stringify(error, null, 2));
        return;
    }

    console.log(`Categories found: ${data?.length}`);
    if (data && data.length > 0) {
        console.log('Sample:', data[0]);
    } else {
        console.log('No categories found.');
    }
}

checkCategories();
