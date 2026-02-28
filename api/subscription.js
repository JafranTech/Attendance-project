'use strict';
const { getClient } = require('../lib/supabaseClient');
const { authenticate } = require('../lib/authMiddleware');

module.exports = async function handler(req, res) {
    try {
        if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        if (!authenticate(req, res)) return;

        const user_id = req.user_id;
        const supabase = getClient();

        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select('plan, expiry_date')
            .eq('user_id', user_id)
            .order('expiry_date', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('[subscription] Fetch error:', error);
            return res.status(500).json({ error: 'Failed to fetch subscription' });
        }

        if (!subscription) {
            return res.status(200).json({ status: 'none', plan: null, expiry_date: null, days_remaining: 0 });
        }

        const now = new Date();
        const expiry = new Date(subscription.expiry_date);
        const isExpired = now > expiry;
        const msRemaining = expiry - now;
        const days_remaining = isExpired ? 0 : Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

        return res.status(200).json({
            status: isExpired ? 'expired' : 'active',
            plan: subscription.plan,
            expiry_date: subscription.expiry_date,
            days_remaining,
        });

    } catch (err) {
        console.error('[subscription] Unhandled error:', err.message, err.stack);
        return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
};
