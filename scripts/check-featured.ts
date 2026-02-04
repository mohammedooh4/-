
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkFeatured() {
    console.log('\n--- Checking for "featured" column ---');
    // Try to select 'featured' from one product
    const { data, error } = await supabase.from('products').select('featured').limit(1);

    if (error) {
        console.log('Error (likely missing column):', error.message);
    } else {
        console.log('Column "featured" exists!');
    }
}

checkFeatured();
