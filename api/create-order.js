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

module.exports = async function handler(req, res) {
    // ── Method guard ───────────────────────────────────────────────────────────
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // ── Auth guard ─────────────────────────────────────────────────────────────
    if (!authenticate(req, res)) return;

    // ── Env guard ──────────────────────────────────────────────────────────────
    let keyId, keySecret;
    try {
        keyId    = requireEnv('Razorpay Key ID',     ['RAZORPAY_KEY_ID']);
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
            receipt: `rcpt_${req.user_id}_${Date.now()}`,
            notes: {
                user_id: String(req.user_id),
                plan,
                days:    String(days),
            },
        });

        // ── BUG 1 FIX: include razorpay_key_id so the frontend can open the modal ──
        return res.status(200).json({
            order_id:       order.id,
            amount:         order.amount,
            currency:       order.currency,
            plan,
            days,
            razorpay_key_id: keyId,          // ← was missing — modal would silently fail
        });

    } catch (err) {
        console.error('[create-order] Razorpay API error:', err.message);
        return res.status(500).json({ error: 'Failed to create payment order', detail: err.message });
    }
};
