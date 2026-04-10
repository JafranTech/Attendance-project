'use strict';
const crypto = require('crypto');
const { getClient } = require('../lib/supabaseClient');
const { requireEnv } = require('../lib/env');

const PLAN_DAYS = { monthly: 30, semester: 180 };
const HANDLED_EVENTS = new Set(['payment.captured', 'order.paid']);

async function logTransaction({ user_id, razorpay_order_id, razorpay_payment_id, amount, currency, plan, status, raw_payload }) {
    try {
        const supabase = getClient();
        const { error } = await supabase
            .from('payment_transactions')
            .insert({ user_id, razorpay_order_id, razorpay_payment_id, amount, currency, plan, status, raw_payload });
        if (error) console.error('[webhook] logTx DB error:', error.message);
        return { error: error ? error.message : null };
    } catch (err) {
        console.error('[webhook] logTx exception:', err.message);
        return { error: err.message };
    }
}

async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    console.log('[webhook] Received POST request');

    // Helper to log to DB and return response
    const failWith400 = async (reason, payload = {}) => {
        await logTransaction({ user_id: 'unknown', status: 'failure_400', raw_payload: { reason, payload } });
        return res.status(400).json({ error: reason });
    };

    let webhookSecret;
    try {
        webhookSecret = requireEnv('Razorpay webhook secret', ['RAZORPAY_WEBHOOK_SECRET']);
    } catch (err) {
        await logTransaction({ user_id: 'unknown', status: 'failure_500', raw_payload: { reason: 'Missing RAZORPAY_WEBHOOK_SECRET' } });
        return res.status(500).json({ error: 'Server misconfiguration' });
    }

    let rawBody;
    try {
        rawBody = await getRawBody(req);
    } catch (err) {
        return await failWith400('Could not read request body', { error: err.message });
    }

    if (!rawBody || rawBody.length === 0) {
         // Some environments pre-parse body and stream doesn't work. Check if req.body exists.
        if (req.body && Object.keys(req.body).length > 0) {
            return await failWith400('Vercel body parser still active—cannot verify HMAC signature. Ensure bodyParser is false.');
        }
        return await failWith400('Empty raw body received');
    }

    const razorpaySignature = req.headers['x-razorpay-signature'];
    if (!razorpaySignature) {
        return await failWith400('Missing x-razorpay-signature header');
    }

    const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    if (expectedSignature !== razorpaySignature) {
        return await failWith400('Invalid signature — secret mismatch', { 
            received: razorpaySignature, 
            expected: expectedSignature,
            bodyLength: rawBody.length,
            secretLength: webhookSecret.length
        });
    }

    let event;
    try {
        event = JSON.parse(rawBody);
    } catch {
        return await failWith400('Invalid JSON payload');
    }

    if (!HANDLED_EVENTS.has(event.event)) {
        await logTransaction({ user_id: 'unknown', status: 'ignored', raw_payload: { event: event.event } });
        return res.status(200).json({ received: true, action: 'ignored', event: event.event });
    }

    const payment = event.payload?.payment?.entity;
    if (!payment) {
        return await failWith400('Malformed payment payload — missing payment entity', { event });
    }

    const notes   = payment.notes || {};
    const user_id = notes.user_id;
    const plan    = notes.plan;
    const days    = parseInt(notes.days, 10) || PLAN_DAYS[plan];

    if (!user_id || !plan || !days) {
        await logTransaction({
            user_id: user_id || 'unknown',
            razorpay_order_id: payment.order_id,
            razorpay_payment_id: payment.id,
            amount: payment.amount,
            currency: payment.currency,
            plan: plan || null,
            status: 'bad_payload',
            raw_payload: { error: 'Missing user_id, plan, or days in payment notes', notes, event }
        });
        return res.status(400).json({ error: 'Missing user_id, plan, or days in payment notes' });
    }

    const txLog = await logTransaction({
        user_id,
        razorpay_order_id: payment.order_id,
        razorpay_payment_id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        plan,
        status: 'success',
        raw_payload: event,
    });

    if (txLog.error) {
        return res.status(500).json({ error: 'Audit log write failed — will retry' });
    }

    try {
        await updateSubscription({ user_id, plan, days, payment_id: payment.id });
    } catch (err) {
        await logTransaction({
            user_id,
            razorpay_order_id: payment.order_id,
            razorpay_payment_id: payment.id,
            status: 'db_error',
            raw_payload: { error: err.message }
        });
        return res.status(500).json({ error: 'Failed to update subscription' });
    }

    return res.status(200).json({ success: true });
}

async function updateSubscription({ user_id, plan, days, payment_id }) {
    const supabase = getClient();
    const { data: existing, error: fetchErr } = await supabase
        .from('subscriptions')
        .select('id, expiry_date, razorpay_payment_id')
        .eq('user_id', user_id)
        .order('expiry_date', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (fetchErr) throw new Error(`Fetch failed: ${fetchErr.message}`);

    if (existing && existing.razorpay_payment_id === payment_id) return;

    const base = existing && new Date(existing.expiry_date) > new Date() ? new Date(existing.expiry_date) : new Date();
    const newExpiry = new Date(base);
    newExpiry.setDate(newExpiry.getDate() + days);

    if (existing) {
        const { error } = await supabase.from('subscriptions').update({ plan, expiry_date: newExpiry.toISOString(), razorpay_payment_id: payment_id }).eq('id', existing.id);
        if (error) throw new Error(`Update failed: ${error.message}`);
    } else {
        const { error } = await supabase.from('subscriptions').insert({ user_id, plan, expiry_date: newExpiry.toISOString(), razorpay_payment_id: payment_id });
        if (error) throw new Error(`Insert failed: ${error.message}`);
    }
}

function getRawBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end',  () => resolve(data));
        req.on('error', reject);
    });
}

const config = {
    api: {
        bodyParser: false,
    },
};

module.exports = handler;
module.exports.config = config;
