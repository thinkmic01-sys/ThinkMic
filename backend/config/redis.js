const Redis = require('ioredis');

const connection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null,
});

connection.on('error', (err) => {
    console.error('Redis connection error:', err);
});

module.exports = connection;
