'use strict';
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getClient } = require('../lib/supabaseClient');
const { requireEnv } = require('../lib/env');

module.exports = async function handler(req, res) {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        // ── Env guard ─────────────────────────────────────────────────────────
        let jwtSecret;
        try {
            jwtSecret = requireEnv('JWT secret', ['JWT_SECRET', 'AUTH_JWT_SECRET']);
        } catch (err) {
            console.error('[login] JWT env error:', err.message);
            return res.status(500).json({ error: `Server misconfiguration: ${err.message}` });
        }

        // ── Input validation ──────────────────────────────────────────────────
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ error: 'email and password are required' });
        }

        // ── Supabase lookup ───────────────────────────────────────────────────
        const supabase = getClient();
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, password_hash, name, department, config')
            .eq('email', email)
            .single();

        if (userError || !user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // ── Password check ────────────────────────────────────────────────────
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // ── Create trial subscription on FIRST login only ─────────────────────
        // Uses ON CONFLICT DO NOTHING to handle race conditions safely.
        // If a subscription row already exists for this user, nothing changes.
        const now = new Date();
        const trialExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); // exactly 24 hours

        const { error: subError } = await supabase
            .from('subscriptions')
            .insert({
                user_id: user.id,
                plan: 'trial',
                start_date: now.toISOString(),
                expiry_date: trialExpiry.toISOString(),
                status: 'active',
            })
            .select()
            // Supabase JS v2: to ignore duplicate key, check error code
            // ON CONFLICT is handled by catching the unique violation below
            ;

        // Unique violation on user_id = subscription already exists — this is expected
        if (subError && subError.code !== '23505') {
            console.error('[login] Subscription insert error:', subError);
            // Non-fatal: trial creation failed but login can still proceed
        }

        // ── Sign JWT ──────────────────────────────────────────────────────────
        const token = jwt.sign(
            { user_id: user.id, email: user.email },
            jwtSecret,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            token,
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email,
                department: user.department,
                config: user.config
            },
        });

    } catch (err) {
        console.error('[login] Unhandled error:', err.message, err.stack);
        return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
};
