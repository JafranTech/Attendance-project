'use strict';
const Razorpay = require('razorpay');
const { authenticate } = require('../lib/authMiddleware');
const { requireEnv } = require('../lib/env');

// ── Plan catalogue ─────────────────────────────────────────────────────────────
// Amount is in paise (₹10 = 1000 paise, ₹29 = 2900 paise)
const PLANS = {
    monthly:  { amount: 1000, currency: 'INR', days: 30 },
    semester: { amount: 2900, currency: 'INR', days: 180 },
};

// ── In-memory rate limiter ─────────────────────────────────────────────────────
// Limits: 5 order-creation attempts per user_id per 10 minutes.
//
// NOTE: Vercel serverless functions are stateless — cold starts reset this Map.
// This is acceptable for spam prevention; it is NOT a hard security boundary.
// For strict rate limiting, replace with an Upstash Redis counter.
const RATE_WINDOW_MS  = 10 * 60 * 1000; // 10 minutes
const RATE_MAX        = 5;              // max attempts per window
const rateLimitStore  = new Map();      // Map<user_id, number[]> (timestamps)

function checkRateLimit(user_id) {
    const now  = Date.now();
    const key  = String(user_id);
    const hits = (rateLimitStore.get(key) || []).filter(ts => now - ts < RATE_WINDOW_MS);

    if (hits.length >= RATE_MAX) {
        return { allowed: false, retryAfterMs: RATE_WINDOW_MS - (now - hits[0]) };
    }

    hits.push(now);
    rateLimitStore.set(key, hits);
    return { allowed: true };
}

// Periodically purge stale entries to prevent memory leak in long-lived instances
setInterval(() => {
    const now = Date.now();
    for (const [key, hits] of rateLimitStore.entries()) {
        const fresh = hits.filter(ts => now - ts < RATE_WINDOW_MS);
        if (fresh.length === 0) rateLimitStore.delete(key);
        else rateLimitStore.set(key, fresh);
    }
}, 5 * 60 * 1000); // prune every 5 minutes

module.exports = async function handler(req, res) {
    // ── Method guard ───────────────────────────────────────────────────────────
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // ── Auth guard ─────────────────────────────────────────────────────────────
    if (!authenticate(req, res)) return;

    // ── Rate limit check ───────────────────────────────────────────────────────
    const rl = checkRateLimit(req.user_id);
    if (!rl.allowed) {
        const retrySecs = Math.ceil(rl.retryAfterMs / 1000);
        console.warn(`[create-order] Rate limit hit for user ${req.user_id}`);
        return res.status(429).json({
            error:       'Too many order creation attempts. Please wait before trying again.',
            retry_after: retrySecs,
        });
    }

    // ── Env guard ──────────────────────────────────────────────────────────────
    let keyId, keySecret;
    try {
        keyId     = requireEnv('Razorpay Key ID',     ['RAZORPAY_KEY_ID']);
        keySecret = requireEnv('Razorpay Key Secret', ['RAZORPAY_KEY_SECRET']);
    } catch (err) {
        console.error('[create-order] Razorpay env missing:', err.message);
        return res.status(500).json({ error: `Server misconfiguration: ${err.message}` });
    }

    // ── Plan validation ────────────────────────────────────────────────────────
    const { plan } = req.body || {};
    if (!plan || !PLANS[plan]) {
        return res.status(400).json({
            error: `Invalid plan. Valid options: ${Object.keys(PLANS).join(', ')}`,
        });
    }

    // ── Create Razorpay order ──────────────────────────────────────────────────
    try {
        const { amount, currency, days } = PLANS[plan];
        const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

        const order = await razorpay.orders.create({
            amount,
            currency,
            receipt: `rcpt_${String(req.user_id).slice(0, 8)}_${Date.now()}`,
            notes: {
                user_id: String(req.user_id),
                plan,
                days:    String(days),
            },
        });

        // Include razorpay_key_id so the frontend can open the modal
        return res.status(200).json({
            order_id:        order.id,
            amount:          order.amount,
            currency:        order.currency,
            plan,
            days,
            razorpay_key_id: keyId,
        });

    } catch (err) {
        console.error('[create-order] Razorpay API error:', err.error || err.message);
        return res.status(500).json({
            error:  'Failed to create payment order',
            detail: err.error ? err.error.description : err.message || err.toString(),
        });
    }
};
