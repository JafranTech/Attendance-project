'use strict';
const bcrypt = require('bcryptjs');
const { getClient } = require('../lib/supabaseClient');

module.exports = async function handler(req, res) {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        const { name, email, password } = req.body || {};
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'name, email, and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const supabase = getClient();

        // ── Duplicate email check ─────────────────────────────────────────────
        const { data: existing, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (checkError) {
            console.error('[register] Duplicate-check query failed:', checkError);
            return res.status(500).json({ error: 'Database error during email check', detail: checkError.message });
        }

        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // ── Hash password ─────────────────────────────────────────────────────
        const password_hash = await bcrypt.hash(password, 12);

        // ── Create user ───────────────────────────────────────────────────────
        const { error: userError } = await supabase
            .from('users')
            .insert({ name, email, password_hash });

        if (userError) {
            console.error('[register] User insert error:', userError);
            return res.status(500).json({ error: 'Failed to create user', detail: userError.message });
        }

        // NOTE: Trial subscription is NOT created here.
        // It is created on the user's FIRST successful login.
        return res.status(201).json({
            message: 'Registration successful. Login to start your 24-hour free trial.'
        });

    } catch (err) {
        console.error('[register] Unhandled error:', err.message, err.stack);
        return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
};
