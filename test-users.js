require('dotenv').config();
const { getClient } = require('./lib/supabaseClient');
async function run() {
    const supabase = getClient();
    const { data } = await supabase.from('users').select('id, name, email, department, config');
    
    const emailCounts = {};
    for (const row of data) {
        emailCounts[row.email] = (emailCounts[row.email] || 0) + 1;
    }
    
    console.log("Found", data.length, "total users.");
    
    for (const email in emailCounts) {
        if (emailCounts[email] > 1) {
            console.log(`DUPLICATE EMAIL FOUND: ${email} (${emailCounts[email]} times)`);
            const duplicates = data.filter(d => d.email === email);
            duplicates.forEach(d => console.log(`  - ID: ${d.id}, name: ${d.name}, dept: ${d.department}`));
        }
    }
    
    if (Object.keys(emailCounts).every(k => emailCounts[k] <= 1)) {
        console.log("No duplicate emails found.");
    }
    
    console.log('\nTop 5 latest users:');
    console.log(data.slice(-5).map(u => ({ id: u.id, email: u.email, name: u.name, dept: u.department })));
}
run();
