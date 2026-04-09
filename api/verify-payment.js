'use strict';
const crypto = require('crypto');
const { authenticate } = require('../lib/authMiddleware');
const { requireEnv } = require('../lib/env');

/**
 * POST /api/verify-payment
 *
 * Client-side HMAC verification fallback.
 * Accepts the three fields Razorpay passes to the client handler callback,
 * recomputes the expected HMAC, and returns whether the signature is valid.
 *
 * IMPORTANT: This endpoint does NOT update the database.
 * The subscription DB update happens ONLY via the server-to-server webhook
 * (/api/webhook) which is independently HMAC-verified with the webhook secret.
 * This endpoint exists so the frontend can confirm a payment is authentic
 * without waiting for webhook propagation.
 *
 * Signature algorithm (Razorpay spec):
 *   HMAC-SHA256( razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET )
 */
module.exports = async function handler(req, res) {
    // ── Method guard ─────────────────────────────────────────────────────────
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // ── Auth guard (must be a logged-in user) ─────────────────────────────────
    if (!authenticate(req, res)) return;

    // ── Env guard ─────────────────────────────────────────────────────────────
    let keySecret;
    try {
        keySecret = requireEnv('Razorpay Key Secret', ['RAZORPAY_KEY_SECRET']);
    } catch (err) {
        console.error('[verify-payment] Env missing:', err.message);
        return res.status(500).json({ error: `Server misconfiguration: ${err.message}` });
    }

    // ── Input validation ──────────────────────────────────────────────────────
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body || {};

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return res.status(400).json({
            error: 'Missing required fields: razorpay_payment_id, razorpay_order_id, razorpay_signature',
        });
    }

    // Sanity check — payment IDs must look like Razorpay IDs (alphanumeric + underscore)
    const ID_RE = /^[A-Za-z0-9_]{8,64}$/;
    if (!ID_RE.test(razorpay_payment_id) || !ID_RE.test(razorpay_order_id)) {
        return res.status(400).json({ error: 'Invalid payment or order ID format' });
    }

    // ── HMAC verification ─────────────────────────────────────────────────────
    // Razorpay spec: sign( order_id + "|" + payment_id ) with key_secret
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSig = crypto
        .createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const provided = Buffer.from(razorpay_signature, 'hex');
    const expected  = Buffer.from(expectedSig, 'hex');

    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
        console.warn('[verify-payment] Signature mismatch — tampered payload?', {
            order_id: razorpay_order_id,
            payment_id: razorpay_payment_id,
        });
        return res.status(400).json({ error: 'Invalid signature — payment could not be verified' });
    }

    // ── Success ───────────────────────────────────────────────────────────────
    console.log('[verify-payment] Signature valid:', {
        order_id:   razorpay_order_id,
        payment_id: razorpay_payment_id,
    });

    return res.status(200).json({
        valid:              true,
        razorpay_order_id,
        razorpay_payment_id,
        message:            'Payment signature verified. Subscription will activate once webhook is processed.',
    });
};
