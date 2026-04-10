const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = env.match(/SUPABASE_URL="(.*?)"/)[1];
const SUPABASE_SERVICE_ROLE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY="(.*?)"/)[1];

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Fetching latest payment_transactions...");
    const { data: tx, error: txError } = await supabase
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
        
    console.log("Transactions:", JSON.stringify(tx, null, 2));

    console.log("Fetching latest subscriptions...");
    const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(3);
        
    console.log("Subscriptions:", JSON.stringify(sub, null, 2));
}

run();
