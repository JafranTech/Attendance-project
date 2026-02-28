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
            .select('id, email, password_hash, name')
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

        // ── Sign JWT ──────────────────────────────────────────────────────────
        const token = jwt.sign(
            { user_id: user.id, email: user.email },
            jwtSecret,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            token,
            user: { id: user.id, name: user.name, email: user.email },
        });

    } catch (err) {
        console.error('[login] Unhandled error:', err.message, err.stack);
        return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
};
