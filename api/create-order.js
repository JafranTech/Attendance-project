'use strict';
const Razorpay = require('razorpay');
const { authenticate } = require('../lib/authMiddleware');

// Plan definitions (amounts in paise: 1 INR = 100 paise)
const PLANS = {
    monthly: { amount: 1000, currency: 'INR', days: 30 }, // ₹10
    semester: { amount: 2900, currency: 'INR', days: 180 }, // ₹29
};

module.exports = async function handler(req, res) {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        if (!authenticate(req, res)) return;

        // ── Env guard ─────────────────────────────────────────────────────────
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            console.error('[create-order] Razorpay env vars missing');
            return res.status(500).json({ error: 'Server misconfiguration: Razorpay keys missing' });
        }

        // ── Input validation ──────────────────────────────────────────────────
        const { plan } = req.body || {};

        if (!plan || !PLANS[plan]) {
            return res.status(400).json({
                error: `Invalid plan. Valid options: ${Object.keys(PLANS).join(', ')}`,
            });
        }

        const { amount, currency, days } = PLANS[plan];

        // ── Create Razorpay order (lazy init inside handler) ──────────────────
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const order = await razorpay.orders.create({
            amount,
            currency,
            receipt: `rcpt_${req.user_id}_${Date.now()}`,
            notes: {
                user_id: String(req.user_id),
                plan,
                days: String(days),
            },
        });

        return res.status(200).json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            plan,
            days,
        });

    } catch (err) {
        console.error('[create-order] Unhandled error:', err.message, err.stack);
        return res.status(500).json({ error: 'Failed to create payment order', detail: err.message });
    }
};
