'use strict';

/**
 * Pick the first non-empty value from a list of env var names.
 * Returns an empty string if none are set.
 *
 * @param {string[]} names
 * @returns {string}
 */
function pickEnv(names) {
    for (const name of names) {
        const val = (process.env[name] || '').trim();
        if (val) return val;
    }
    return '';
}

/**
 * Return the first non-empty value from a list of env var names,
 * or throw a descriptive error if none are found.
 *
 * @param {string}   label  - Human-readable label for error messages
 * @param {string[]} names  - List of acceptable env var names (checked in order)
 * @returns {string}
 */
function requireEnv(label, names) {
    const val = pickEnv(names);
    if (!val) {
        throw new Error(`${label} missing. Set one of: ${names.join(', ')}`);
    }
    return val;
}

module.exports = { pickEnv, requireEnv };
