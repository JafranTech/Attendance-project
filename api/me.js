'use strict';
const { getClient } = require('../lib/supabaseClient');
const { authenticate } = require('../lib/authMiddleware');

module.exports = async function handler(req, res) {
    try {
        if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        if (!authenticate(req, res)) return;

        const supabase = getClient();
        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, department, config')
            .eq('id', req.user_id)
            .single();

        if (error || !user) {
            console.error('[me] Fetch error:', error);
            return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json({ user });

    } catch (err) {
        console.error('[me] Unhandled error:', err.message, err.stack);
        return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
};
