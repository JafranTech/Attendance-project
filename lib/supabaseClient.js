'use strict';
const { createClient } = require('@supabase/supabase-js');
const { requireEnv } = require('./env');

/**
 * Lazily-initialised Supabase client.
 * Accepts aliases:
 *   URL  → SUPABASE_URL | NEXT_PUBLIC_SUPABASE_URL
 *   Key  → SUPABASE_SERVICE_ROLE_KEY | SUPABASE_SERVICE_KEY
 */
let _client = null;

function getClient() {
    if (_client) return _client;

    const url = requireEnv('Supabase URL', ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']);
    const key = requireEnv('Supabase service role key', ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY']);

    _client = createClient(url, key, {
        auth: { persistSession: false },
    });

    return _client;
}

module.exports = { getClient };
