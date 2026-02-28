'use strict';
const jwt = require('jsonwebtoken');
const { requireEnv } = require('./env');

/**
 * JWT middleware — validates Bearer token and attaches user_id to req.
 * Returns false and sends 401 if token is missing/invalid.
 * Returns false and sends 500 if JWT secret is not configured.
 */
function authenticate(req, res) {
    // Resolve JWT secret (accept alias names)
    let jwtSecret;
    try {
        jwtSecret = requireEnv('JWT secret', ['JWT_SECRET', 'AUTH_JWT_SECRET']);
    } catch (err) {
        res.status(500).json({ error: `Server misconfiguration: ${err.message}` });
        return false;
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or malformed Authorization header' });
        return false;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.user_id = decoded.user_id;
        return true;
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return false;
    }
}

module.exports = { authenticate };
