'use strict';
const { createClient } = require('@supabase/supabase-js');

/**
 * Lazily-initialised Supabase client.
 *
 * WHY LAZY?
 * A top-level `throw` inside a CommonJS module crashes the entire Vercel
 * function at cold-start — before any request is handled — and produces
 * FUNCTION_INVOCATION_FAILED with no useful error in the logs.
 * By moving validation inside getClient(), the crash becomes a proper
 * 500 JSON response with a descriptive message.
 */
let _client = null;

function getClient() {
    if (_client) return _client;

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error(
            'Supabase env vars missing: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY not set in Vercel dashboard.'
        );
    }

    _client = createClient(url, key, {
        auth: { persistSession: false },
    });

    return _client;
}

module.exports = { getClient };
