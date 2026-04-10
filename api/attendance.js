'use strict';
const { getClient } = require('../lib/supabaseClient');
const { authenticate } = require('../lib/authMiddleware');

module.exports = async function handler(req, res) {
    try {
        // ── Auth ──────────────────────────────────────────────────────────────
        if (!authenticate(req, res)) return;

        const user_id = req.user_id;
        const supabase = getClient();

        // ── GET – fetch all attendance records (no subscription check) ─────────
        // Expired users can still view their historical data.
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('attendance')
                .select('subject, date, status')
                .eq('user_id', user_id)
                .order('date', { ascending: false });

            if (error) {
                console.error('[attendance] Fetch error:', error);
                return res.status(500).json({ error: 'Failed to fetch attendance' });
            }

            return res.status(200).json({ attendance: data });
        }

        // ── POST – subscription check before insert/update ────────────────────
        if (req.method === 'POST') {
            // Enforce subscription expiry only on writes
            const { data: subscription, error: subError } = await supabase
                .from('subscriptions')
                .select('expiry_date, plan, status')
                .eq('user_id', user_id)
                .order('expiry_date', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (subError) {
                console.error('[attendance] Subscription fetch error:', subError);
                return res.status(500).json({ error: 'Failed to check subscription' });
            }

            if (!subscription) {
                return res.status(403).json({
                    error: 'subscription_expired',
                    message: 'No active subscription found. Please login to start your trial.',
                    redirect: '/plans.html',
                });
            }

            if (new Date() > new Date(subscription.expiry_date)) {
                return res.status(403).json({
                    error: 'subscription_expired',
                    message: 'Your trial has ended. Upgrade to continue marking attendance.',
                    expired_at: subscription.expiry_date,
                    redirect: '/plans.html',
                });
            }

            // ── Validate input ────────────────────────────────────────────────
            const { subject, date, status } = req.body || {};

            if (!subject || !date || !status) {
                return res.status(400).json({ error: 'subject, date, and status are required' });
            }

            const validStatuses = ['P', 'A', 'present', 'absent', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
            }

            // ── Upsert attendance record ──────────────────────────────────────
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

        // ── DELETE – remove an attendance record or WIPE all ──────────────────
        if (req.method === 'DELETE') {
            const { subject, date, wipeAll } = req.body || {};
            
            if (wipeAll === true) {
                const { error } = await supabase
                    .from('attendance')
                    .delete()
                    .eq('user_id', user_id);

                if (error) {
                    console.error('[attendance] Wipe error:', error);
                    return res.status(500).json({ error: 'Failed to wipe attendance' });
                }
                return res.status(200).json({ message: 'All attendance wiped' });
            }

            if (!subject || !date) {
                return res.status(400).json({ error: 'subject and date are required unless wipeAll is true' });
            }

            const { error } = await supabase
                .from('attendance')
                .delete()
                .eq('user_id', user_id)
                .eq('subject', subject)
                .eq('date', date);

            if (error) {
                console.error('[attendance] Delete error:', error);
                return res.status(500).json({ error: 'Failed to delete attendance' });
            }

            return res.status(200).json({ message: 'Attendance record removed' });
        }

        return res.status(405).json({ error: 'Method Not Allowed' });

    } catch (err) {
        console.error('[attendance] Unhandled error:', err.message, err.stack);
        return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
};
