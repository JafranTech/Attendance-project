const jwt = require('jsonwebtoken');

/**
 * Validates the JWT from the Authorization header and attaches user_id to the request object.
 * Returns false and sends a 401 response if the token is missing or invalid.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {boolean} true if authentication succeeded, false otherwise
 */
function authenticate(req, res) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or malformed Authorization header' });
        return false;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user_id = decoded.user_id;
        return true;
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return false;
    }
}

module.exports = { authenticate };
