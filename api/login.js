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
        // Only inserts if no subscription row exists for this user yet.
        // Uses maybeSingle check first to avoid triggering UNIQUE violation
        // on user_id which shows up as 409 in Supabase logs.
        const now = new Date();
        const trialExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); // exactly 24 hours

        const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (!existingSub) {
            const { error: subError } = await supabase
                .from('subscriptions')
                .insert({
                    user_id:     user.id,
                    plan:        'trial',
                    expiry_date: trialExpiry.toISOString(),
                    // razorpay_payment_id intentionally omitted (NULL for trials)
                });

            if (subError && subError.code !== '23505') {
                // 23505 = unique violation = race condition with another login, safe to ignore
                console.error('[login] Trial subscription insert error:', subError.message);
                // Non-fatal: login succeeds even if trial creation fails
            }
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
