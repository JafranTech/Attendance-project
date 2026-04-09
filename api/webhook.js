'use strict';
const crypto = require('crypto');
const { getClient } = require('../lib/supabaseClient');
const { requireEnv } = require('../lib/env');

// ── Plan duration map (fallback if notes.days is missing) ─────────────────────
const PLAN_DAYS = { monthly: 30, semester: 180 };

// ── Handle BOTH reliable Razorpay success events ───────────────────────────────
//   payment.captured → fired for cards, wallets
//   order.paid       → fired for UPI, netbanking, and as a superset event
const HANDLED_EVENTS = new Set(['payment.captured', 'order.paid']);

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────
async function handler(req, res) {
    // ── Method guard ───────────────────────────────────────────────────────────
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // ── Env guard ──────────────────────────────────────────────────────────────
    let webhookSecret;
    try {
        webhookSecret = requireEnv('Razorpay webhook secret', ['RAZORPAY_WEBHOOK_SECRET']);
    } catch (err) {
        console.error('[webhook] Env missing:', err.message);
        return res.status(500).json({ error: `Server misconfiguration: ${err.message}` });
    }

    // ── Read raw body (bodyParser must be disabled for HMAC to work) ───────────
    let rawBody;
    try {
        rawBody = await getRawBody(req);
    } catch (err) {
        console.error('[webhook] Failed to read body:', err.message);
        return res.status(400).json({ error: 'Could not read request body' });
    }

    // ── HMAC SHA-256 signature verification ────────────────────────────────────
    const razorpaySignature = req.headers['x-razorpay-signature'];
    if (!razorpaySignature) {
        return res.status(400).json({ error: 'Missing x-razorpay-signature header' });
    }

    const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

    if (expectedSignature !== razorpaySignature) {
        console.warn('[webhook] Signature mismatch — possible spoofed request');
        return res.status(400).json({ error: 'Invalid signature' });
    }

    // ── Parse event payload ────────────────────────────────────────────────────
    let event;
    try {
        event = JSON.parse(rawBody);
    } catch {
        return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    // ── Only process the two reliable success events ───────────────────────────
    if (!HANDLED_EVENTS.has(event.event)) {
        return res.status(200).json({ received: true, action: 'ignored' });
    }

    // ── Extract payment entity from either event shape ─────────────────────────
    //   payment.captured → event.payload.payment.entity
    //   order.paid       → event.payload.payment.entity (same path)
    const payment = event.payload?.payment?.entity;
    if (!payment) {
        console.error('[webhook] Malformed payload — no payment entity:', JSON.stringify(event.payload));
        return res.status(400).json({ error: 'Malformed payment payload' });
    }

    // ── Extract metadata from order notes ─────────────────────────────────────
    const notes   = payment.notes || {};
    const user_id = notes.user_id;
    const plan    = notes.plan;
    const days    = parseInt(notes.days, 10) || PLAN_DAYS[plan];

    if (!user_id || !plan || !days) {
        console.error('[webhook] Missing metadata in notes:', notes);
        // Log the bad payload to payment_transactions for audit
        await logTransaction({
            user_id:             user_id || 'unknown',
            razorpay_order_id:   payment.order_id,
            razorpay_payment_id: payment.id,
            amount:              payment.amount,
            currency:            payment.currency,
            plan:                plan || null,
            status:              'bad_payload',
            raw_payload:         event,
        });
        return res.status(400).json({ error: 'Missing user_id, plan, or days in payment notes' });
    }

    // ── AUDIT: Log every webhook event BEFORE touching subscriptions ───────────
    // This record is permanent — even if the subscription upsert fails,
    // this row proves payment was received. Razorpay retries on 500 will
    // create a duplicate row with a new UUID — that is intentional and correct.
    const txLog = await logTransaction({
        user_id,
        razorpay_order_id:   payment.order_id,
        razorpay_payment_id: payment.id,
        amount:              payment.amount,
        currency:            payment.currency,
        plan,
        status:              'success',
        raw_payload:         event,
    });

    if (txLog.error) {
        // Audit log failed — still try to update subscription but return 500
        // so Razorpay retries. On retry the audit log attempt repeats.
        console.error('[webhook] Failed to write audit log:', txLog.error);
        return res.status(500).json({ error: 'Audit log write failed — will retry' });
    }

    // ── Update subscription in Supabase ────────────────────────────────────────
    try {
        await updateSubscription({ user_id, plan, days, payment_id: payment.id });
    } catch (err) {
        // Log the failure status to transactions for dispute resolution
        await logTransaction({
            user_id,
            razorpay_order_id:   payment.order_id,
            razorpay_payment_id: payment.id,
            amount:              payment.amount,
            currency:            payment.currency,
            plan,
            status:              'db_error',
            raw_payload:         { error: err.message, original_event: event },
        });
        console.error('[webhook] Subscription update failed:', err.message);
        return res.status(500).json({ error: 'Failed to update subscription' });
    }

    return res.status(200).json({ success: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// logTransaction — write every webhook event to the audit table
// Never throws — returns { error } so caller decides how to proceed
// ─────────────────────────────────────────────────────────────────────────────
async function logTransaction({
    user_id,
    razorpay_order_id,
    razorpay_payment_id,
    amount,
    currency,
    plan,
    status,
    raw_payload,
}) {
    try {
        const supabase = getClient();
        const { error } = await supabase
            .from('payment_transactions')
            .insert({
                user_id,
                razorpay_order_id,
                razorpay_payment_id,
                amount,
                currency,
                plan,
                status,
                raw_payload,
            });
        if (error) {
            console.error('[webhook] logTransaction DB error:', error.message);
            return { error: error.message };
        }
        return { error: null };
    } catch (err) {
        console.error('[webhook] logTransaction unexpected error:', err.message);
        return { error: err.message };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateSubscription — extend plan from current expiry (or now if expired)
//
// Idempotency: The UNIQUE constraint on razorpay_payment_id in the subscriptions
// table means a second upsert with the same payment_id is rejected at the DB
// level — the subscription row is left unchanged. This is the TRUE idempotency
// guard. The onConflict:'user_id' alone was insufficient.
// ─────────────────────────────────────────────────────────────────────────────
async function updateSubscription({ user_id, plan, days, payment_id }) {
    const supabase = getClient();

    // Fetch existing subscription to calculate correct new expiry
    const { data: existing } = await supabase
        .from('subscriptions')
        .select('expiry_date, razorpay_payment_id')
        .eq('user_id', user_id)
        .order('expiry_date', { ascending: false })
        .limit(1)
        .maybeSingle();

    // ── True idempotency check ────────────────────────────────────────────────
    // If the same payment_id is already stored, this is a duplicate webhook retry.
    // Return early without modifying anything — the subscription is already extended.
    if (existing && existing.razorpay_payment_id === payment_id) {
        console.log(
            `[webhook] Duplicate webhook detected — payment_id ${payment_id} already processed. Skipping.`
        );
        return; // No-op — idempotent
    }

    // Extend from current expiry if still active, otherwise start from now
    const base = existing && new Date(existing.expiry_date) > new Date()
        ? new Date(existing.expiry_date)
        : new Date();

    const newExpiry = new Date(base);
    newExpiry.setDate(newExpiry.getDate() + days);

    // upsert on user_id; UNIQUE constraint on razorpay_payment_id provides
    // the DB-level safety net if two concurrent requests race through here
    const { error } = await supabase
        .from('subscriptions')
        .upsert(
            {
                user_id,
                plan,
                expiry_date:         newExpiry.toISOString(),
                razorpay_payment_id: payment_id,
            },
            { onConflict: 'user_id' }
        );

    if (error) throw new Error(error.message);

    console.log(
        `[webhook] Subscription updated: user=${user_id} plan=${plan}` +
        ` expires=${newExpiry.toISOString()} payment_id=${payment_id}`
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// getRawBody — reads raw request body as a string for HMAC verification
// bodyParser MUST be disabled (see handler.config below)
// ─────────────────────────────────────────────────────────────────────────────
function getRawBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end',  () => resolve(data));
        req.on('error', reject);
    });
}

// Disable Vercel's default body parser so we get the raw bytes for HMAC
handler.config = { api: { bodyParser: false } };

module.exports = handler;
