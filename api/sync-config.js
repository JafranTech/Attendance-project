'use strict';
const { getClient } = require('../lib/supabaseClient');
const { authenticate } = require('../lib/authMiddleware');

module.exports = async function handler(req, res) {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        // Auth: validates Bearer token, attaches req.user_id
        if (!authenticate(req, res)) return;

        const user_id = req.user_id;
        const { department, config } = req.body || {};

        // Build update payload — only include fields that are actually provided
        const updateData = {};
        if (department !== undefined && department !== null) updateData.department = department;
        if (config !== undefined && config !== null) updateData.config = config;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No data provided to sync' });
        }

        const supabase = getClient();
        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', user_id)
            .select('id, department, config')
            .single();

        if (error) {
            console.error('[sync-config] Update error:', error);
            return res.status(500).json({ error: 'Failed to save config', detail: error.message });
        }

        return res.status(200).json({ success: true, user: data });

    } catch (err) {
        console.error('[sync-config] Unhandled error:', err.message, err.stack);
        return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
};
