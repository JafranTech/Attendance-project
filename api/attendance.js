'use strict';
const { getClient } = require('../lib/supabaseClient');
const { authenticate } = require('../lib/authMiddleware');

module.exports = async function handler(req, res) {
    try {
        // ── Auth ──────────────────────────────────────────────────────────────
        if (!authenticate(req, res)) return;

        const user_id = req.user_id;
        const supabase = getClient();

        // ── Subscription expiry check ─────────────────────────────────────────
        const { data: subscription, error: subError } = await supabase
            .from('subscriptions')
            .select('expiry_date, plan')
            .eq('user_id', user_id)
            .order('expiry_date', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (subError) {
            console.error('[attendance] Subscription fetch error:', subError);
            return res.status(500).json({ error: 'Failed to check subscription' });
        }

        if (!subscription) {
            return res.status(403).json({ error: 'No subscription found. Please register or contact support.' });
        }

        if (new Date() > new Date(subscription.expiry_date)) {
            return res.status(403).json({
                error: 'Subscription expired. Please renew your plan to continue.',
                expired_at: subscription.expiry_date,
            });
        }

        // ── GET – fetch attendance records ────────────────────────────────────
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('attendance')
                .select('*')
                .eq('user_id', user_id)
                .order('date', { ascending: false });

            if (error) {
                console.error('[attendance] Fetch error:', error);
                return res.status(500).json({ error: 'Failed to fetch attendance' });
            }

            return res.status(200).json({ attendance: data });
        }

        // ── POST – upsert attendance record ───────────────────────────────────
        if (req.method === 'POST') {
            const { subject, date, status } = req.body || {};

            if (!subject || !date || !status) {
                return res.status(400).json({ error: 'subject, date, and status are required' });
            }

            const validStatuses = ['present', 'absent', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
            }

            const { data, error } = await supabase
                .from('attendance')
                .upsert(
                    { user_id, subject, date, status },
                    { onConflict: 'user_id,subject,date' }
                )
                .select()
                .single();

            if (error) {
                console.error('[attendance] Upsert error:', error);
                return res.status(500).json({ error: 'Failed to save attendance' });
            }

            return res.status(200).json({ message: 'Attendance saved', record: data });
        }

        return res.status(405).json({ error: 'Method Not Allowed' });

    } catch (err) {
        console.error('[attendance] Unhandled error:', err.message, err.stack);
        return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
};
