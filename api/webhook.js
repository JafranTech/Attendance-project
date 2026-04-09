'use strict';
const crypto = require('crypto');
const { getClient } = require('../lib/supabaseClient');
const { requireEnv } = require('../lib/env');

// ── Plan duration fallback ──────────────────────────────────────────────────
const PLAN_DAYS = { monthly: 30, semester: 180 };

// ── Handle BOTH reliable Razorpay success events ────────────────────────────
//   payment.captured → cards, wallets, netbanking
//   order.paid       → UPI + superset fallback
const HANDLED_EVENTS = new Set(['payment.captured', 'order.paid']);

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────
async function handler(req, res) {
    // ── Method guard ────────────────────────────────────────────────────────
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    console.log('[webhook] Received POST request');

    // ── Env guard ────────────────────────────────────────────────────────────
    let webhookSecret;
    const skipSigCheck = process.env.WEBHOOK_SKIP_SIG === 'true'; // emergency debug only

    try {
        webhookSecret = requireEnv('Razorpay webhook secret', ['RAZORPAY_WEBHOOK_SECRET']);
        console.log('[webhook] RAZORPAY_WEBHOOK_SECRET present, length:', webhookSecret.length);
    } catch (err) {
        if (skipSigCheck) {
            console.error('[webhook] RAZORPAY_WEBHOOK_SECRET MISSING — running in bypass mode (debug only)');
            webhookSecret = null;
        } else {
            console.error('[webhook] CRITICAL: RAZORPAY_WEBHOOK_SECRET env var not set in Vercel!', err.message);
            return res.status(500).json({
                error: 'Server misconfiguration: RAZORPAY_WEBHOOK_SECRET is not set in Vercel environment variables.'
            });
        }
    }

    // ── Read raw body ────────────────────────────────────────────────────────
    let rawBody;
    try {
        rawBody = await getRawBody(req);
        console.log('[webhook] Raw body length:', rawBody.length, 'bytes');
    } catch (err) {
        console.error('[webhook] Failed to read body:', err.message);
        return res.status(400).json({ error: 'Could not read request body' });
    }

    // ── HMAC Signature verification ──────────────────────────────────────────
    const razorpaySignature = req.headers['x-razorpay-signature'];
    console.log('[webhook] x-razorpay-signature header present:', Boolean(razorpaySignature));

    if (!razorpaySignature && !skipSigCheck) {
        console.error('[webhook] Missing x-razorpay-signature header');
        return res.status(400).json({ error: 'Missing x-razorpay-signature header' });
    }

    if (webhookSecret && razorpaySignature) {
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(rawBody)
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            console.error(
                '[webhook] SIGNATURE MISMATCH.',
                '\n  Received :', razorpaySignature.slice(0, 16) + '...',
                '\n  Expected :', expectedSignature.slice(0, 16) + '...',
                '\n  Body len  :', rawBody.length,
                '\n  Secret len:', webhookSecret.length,
                '\n  ACTION: Verify RAZORPAY_WEBHOOK_SECRET in Vercel matches the secret set in Razorpay dashboard.'
            );
            return res.status(400).json({ error: 'Invalid signature — secret mismatch' });
        }
        console.log('[webhook] Signature verified ✓');
    }

    // ── Parse payload ─────────────────────────────────────────────────────────
    let event;
    try {
        event = JSON.parse(rawBody);
        console.log('[webhook] Event type:', event.event);
    } catch {
        console.error('[webhook] Invalid JSON body');
        return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    // ── Filter to handled events only ─────────────────────────────────────────
    if (!HANDLED_EVENTS.has(event.event)) {
        console.log('[webhook] Ignoring unhandled event type:', event.event);
        return res.status(200).json({ received: true, action: 'ignored', event: event.event });
    }

    // ── Extract payment entity ─────────────────────────────────────────────────
    const payment = event.payload?.payment?.entity;
    if (!payment) {
        console.error('[webhook] Malformed payload — no payment.entity found.');
        return res.status(400).json({ error: 'Malformed payment payload — missing payment entity' });
    }

    console.log('[webhook] Payment ID:', payment.id, '| Order ID:', payment.order_id, '| Amount:', payment.amount);

    // ── Extract metadata from order notes ──────────────────────────────────────
    const notes   = payment.notes || {};
    const user_id = notes.user_id;
    const plan    = notes.plan;
    const days    = parseInt(notes.days, 10) || PLAN_DAYS[plan];

    console.log('[webhook] Notes — user_id:', user_id, '| plan:', plan, '| days:', days);

    if (!user_id || !plan || !days) {
        console.error('[webhook] MISSING NOTES — user_id:', user_id, 'plan:', plan, 'days:', days);
        console.error('[webhook] Full notes:', JSON.stringify(notes));
        console.error('[webhook] ACTION: Check that create-order.js sets notes.user_id, notes.plan, notes.days');
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

    // ── AUDIT LOG: Write before any subscription change ─────────────────────────
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
        console.error('[webhook] AUDIT LOG FAILED:', txLog.error, '— returning 500 for Razorpay retry');
        return res.status(500).json({ error: 'Audit log write failed — will retry' });
    }
    console.log('[webhook] Audit log written ✓');

    // ── Update subscription ────────────────────────────────────────────────────
    try {
        await updateSubscription({ user_id, plan, days, payment_id: payment.id });
        console.log('[webhook] Subscription updated successfully ✓');
    } catch (err) {
        console.error('[webhook] Subscription update FAILED:', err.message);
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
        return res.status(500).json({ error: 'Failed to update subscription — Razorpay will retry' });
    }

    return res.status(200).json({ success: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// logTransaction — permanent audit row for every webhook event
// ─────────────────────────────────────────────────────────────────────────────
async function logTransaction({
    user_id, razorpay_order_id, razorpay_payment_id,
    amount, currency, plan, status, raw_payload,
}) {
    try {
        const supabase = getClient();
        const { error } = await supabase
            .from('payment_transactions')
            .insert({ user_id, razorpay_order_id, razorpay_payment_id, amount, currency, plan, status, raw_payload });
        if (error) {
            console.error('[webhook] logTransaction DB error:', error.message, error.code);
            return { error: error.message };
        }
        return { error: null };
    } catch (err) {
        console.error('[webhook] logTransaction unexpected:', err.message);
        return { error: err.message };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateSubscription — explicit SELECT → UPDATE or INSERT
//
// CRITICAL FIX: Supabase JS .upsert() with onConflict:'user_id' throws 409
// when a second UNIQUE column (razorpay_payment_id) also exists on the table.
// PostgREST cannot decide which UNIQUE constraint to honour for the ON CONFLICT
// clause. Fix: SELECT first, then UPDATE by PK or INSERT if no row exists.
// Targeting UPDATE by `.eq('id', existing.id)` avoids all UNIQUE conflicts.
// ─────────────────────────────────────────────────────────────────────────────
async function updateSubscription({ user_id, plan, days, payment_id }) {
    const supabase = getClient();

    // 1. Fetch current subscription row
    const { data: existing, error: fetchErr } = await supabase
        .from('subscriptions')
        .select('id, expiry_date, razorpay_payment_id')
        .eq('user_id', user_id)
        .order('expiry_date', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (fetchErr) {
        throw new Error(`Failed to fetch existing subscription: ${fetchErr.message}`);
    }

    console.log('[webhook] Existing sub:', existing
        ? `expires=${existing.expiry_date} stored_payment_id=${existing.razorpay_payment_id}`
        : 'none'
    );

    // 2. Idempotency: same payment already written?
    if (existing && existing.razorpay_payment_id === payment_id) {
        console.log('[webhook] Duplicate webhook — payment_id already processed. No-op.');
        return;
    }

    // 3. New expiry = current expiry (if active) + days, else now + days
    const base = existing && new Date(existing.expiry_date) > new Date()
        ? new Date(existing.expiry_date)
        : new Date();
    const newExpiry = new Date(base);
    newExpiry.setDate(newExpiry.getDate() + days);

    console.log('[webhook] New expiry calculated:', newExpiry.toISOString());

    if (existing) {
        // 4a. UPDATE by primary key — bypasses both UNIQUE constraints entirely
        const { error: updateErr } = await supabase
            .from('subscriptions')
            .update({
                plan,
                expiry_date:         newExpiry.toISOString(),
                razorpay_payment_id: payment_id,
            })
            .eq('id', existing.id);

        if (updateErr) throw new Error(`Subscription UPDATE failed: ${updateErr.message} (code: ${updateErr.code})`);
        console.log('[webhook] Updated subscription row id:', existing.id);
    } else {
        // 4b. INSERT — user has no subscription at all (edge case post-trial deletion)
        const { error: insertErr } = await supabase
            .from('subscriptions')
            .insert({
                user_id,
                plan,
                expiry_date:         newExpiry.toISOString(),
                razorpay_payment_id: payment_id,
            });

        if (insertErr) throw new Error(`Subscription INSERT failed: ${insertErr.message} (code: ${insertErr.code})`);
        console.log('[webhook] Inserted new subscription row for user:', user_id);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// getRawBody — required for HMAC verification (no body parsing allowed)
// ─────────────────────────────────────────────────────────────────────────────
function getRawBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end',  () => resolve(data));
        req.on('error', reject);
    });
}

// Disable Vercel's automatic body parser so HMAC gets the raw bytes
handler.config = { api: { bodyParser: false } };

module.exports = handler;
