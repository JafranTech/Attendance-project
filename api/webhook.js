'use strict';
const crypto = require('crypto');
const { getClient } = require('../lib/supabaseClient');
const { requireEnv } = require('../lib/env');

const PLAN_DAYS = { monthly: 30, semester: 180 };

async function handler(req, res) {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        // ── Env guard ─────────────────────────────────────────────────────────
        let webhookSecret;
        try {
            webhookSecret = requireEnv('Razorpay webhook secret', ['RAZORPAY_WEBHOOK_SECRET']);
        } catch (err) {
            console.error('[webhook] Env error:', err.message);
            return res.status(500).json({ error: `Server misconfiguration: ${err.message}` });
        }

        const rawBody = await getRawBody(req);
        const razorpaySignature = req.headers['x-razorpay-signature'];

        if (!razorpaySignature) {
            return res.status(400).json({ error: 'Missing x-razorpay-signature header' });
        }

        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(rawBody)
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            console.warn('[webhook] Signature mismatch');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        let event;
        try {
            event = JSON.parse(rawBody);
        } catch {
            return res.status(400).json({ error: 'Invalid JSON payload' });
        }

        if (event.event !== 'payment.captured') {
            return res.status(200).json({ received: true });
        }

        const payment = event.payload?.payment?.entity;
        if (!payment) {
            return res.status(400).json({ error: 'Malformed payment payload' });
        }

        const notes = payment.notes || {};
        const user_id = notes.user_id;
        const plan = notes.plan;
        const days = parseInt(notes.days, 10) || PLAN_DAYS[plan];

        if (!user_id || !plan || !days) {
            console.error('[webhook] Missing metadata:', notes);
            return res.status(400).json({ error: 'Missing user_id, plan, or days in payment notes' });
        }

        const supabase = getClient();

        const { data: existing } = await supabase
            .from('subscriptions')
            .select('expiry_date')
            .eq('user_id', user_id)
            .order('expiry_date', { ascending: false })
            .limit(1)
            .maybeSingle();

        const base = existing && new Date(existing.expiry_date) > new Date()
            ? new Date(existing.expiry_date)
            : new Date();

        const newExpiry = new Date(base);
        newExpiry.setDate(newExpiry.getDate() + days);

        const { error } = await supabase
            .from('subscriptions')
            .upsert(
                { user_id, plan, expiry_date: newExpiry.toISOString(), razorpay_payment_id: payment.id },
                { onConflict: 'user_id' }
            );

        if (error) {
            console.error('[webhook] Subscription upsert error:', error);
            return res.status(500).json({ error: 'Failed to update subscription' });
        }

        console.log(`[webhook] Updated: user=${user_id} plan=${plan} expires=${newExpiry.toISOString()}`);
        return res.status(200).json({ success: true });

    } catch (err) {
        console.error('[webhook] Unhandled error:', err.message, err.stack);
        return res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
}

function getRawBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

handler.config = { api: { bodyParser: false } };
module.exports = handler;
