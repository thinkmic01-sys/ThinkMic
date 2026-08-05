const Redis = require('ioredis');

// Must match workers/config/redis.js's connection logic exactly - this connection is used
// to enqueue jobs (Queue producers in queues.js), while the workers/ one consumes them, so
// a mismatch here silently breaks the API's ability to add jobs even when the worker
// service itself connects fine (this previously defaulted straight to localhost:6379,
// ignoring REDIS_URL entirely, hanging every queue.add() call forever in production).
const connection = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
    : new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
    });

connection.on('error', (err) => {
    console.error('Redis connection error:', err);
});

module.exports = connection;
