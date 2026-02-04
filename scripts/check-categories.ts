
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPage(pageName: string, start: number, end: number) {
    console.log(`\n--- Checking ${pageName} (${start}-${end}) ---`);
    const { data, error, count } = await supabase
        .from('products')
        .select('id, name, price, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, end);

    if (error) {
        console.error(`Error fetching ${pageName}:`, error.message);
        return;
    }

    console.log(`Row count returned: ${data?.length}`);
    if (data && data.length > 0) {
        console.log('First Item:', data[0]);
        console.log('Last Item:', data[data.length - 1]);
        console.log('Sample IDs:', data.map(p => p.id).join(', '));
    } else {
        console.log('No data returned for this range.');
    }
}

async function run() {
    await checkPage('Page 1', 0, 19);
    await checkPage('Page 2', 20, 39);
    await checkPage('Page 3', 40, 59);
}

run();
