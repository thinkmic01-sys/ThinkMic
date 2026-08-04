const rateLimit = require('express-rate-limit');

// Shared limiter for expensive, cost-bearing operations - AI generation (OpenAI/Anthropic/
// Tavily calls) and file uploads (storage + transcription cost). Generous enough for normal
// use, tight enough to blunt scripted abuse/DoS against routes with real per-call cost.
const expensiveOperationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests. Please slow down and try again shortly.' }
});

module.exports = { expensiveOperationLimiter };
