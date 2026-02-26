'use strict';
const bcrypt = require('bcryptjs');
const { getClient } = require('../lib/supabaseClient');

module.exports = async function handler(req, res) {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        // ── Input validation ──────────────────────────────────────────────────
        const { name, email, password } = req.body || {};

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'name, email, and password are required' });
        }

        const supabase = getClient();

        // ── Duplicate check ───────────────────────────────────────────────────
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // ── Hash password ─────────────────────────────────────────────────────
        const password_hash = await bcrypt.hash(password, 12);

        // ── Create user ───────────────────────────────────────────────────────
        const { data: user, error: userError } = await supabase
            .from('users')
            .insert({ name, email, password_hash })
            .select('id')
            .single();

        if (userError) {
            console.error('[register] User insert error:', userError);
            return res.status(500).json({ error: 'Failed to create user' });
        }

        // ── Create 2-day free trial subscription ──────────────────────────────
        const trialExpiry = new Date();
        trialExpiry.setDate(trialExpiry.getDate() + 2);

        const { error: subError } = await supabase
            .from('subscriptions')
            .insert({
                user_id: user.id,
                plan: 'trial',
                expiry_date: trialExpiry.toISOString(),
            });

        if (subError) {
            console.error('[register] Subscription insert error:', subError);
            return res.status(500).json({ error: 'Failed to create trial subscription' });
        }

        return res.status(201).json({ message: 'Registration successful. 2-day free trial activated.' });

    } catch (err) {
        console.error('[register] Unhandled error:', err.message, err.stack);
        return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
};
