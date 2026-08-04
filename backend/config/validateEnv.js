// Fails fast in production if a secret with no safe fallback is missing, rather than
// letting the process boot and fail confusingly (or insecurely) on first real use.
// R2/SMTP/etc are intentionally excluded here - they have designed graceful-degradation
// fallbacks (local disk storage, console-logged OTPs) and are allowed to be absent.
const REQUIRED_IN_PRODUCTION = ['DB_URI', 'JWT_PRIVATE_KEY'];

module.exports = function validateEnv() {
    if (process.env.NODE_ENV !== 'production') return;

    const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        console.error(`FATAL: missing required environment variable(s) in production: ${missing.join(', ')}`);
        process.exit(1);
    }
};
