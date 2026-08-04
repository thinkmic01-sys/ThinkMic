// backend/worker.js
// Entry point for background job processing.
// All workers now live in the root /workers/ directory for clean separation.
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();
require('./config/validateEnv')();

// Connect to MongoDB
connectDB();

console.log('[Worker Node] Booting background processing engine...');

const Redis = require('ioredis');
const redisPub = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// Mock socketUtil so workers can "emit" events via Redis pub/sub
// The main server.js process listens on Redis and forwards to real Socket.IO clients
const socketUtilMock = {
    getIO: () => ({
        to: (userId) => ({
            emit: (event, data) => {
                redisPub.publish('socket_events', JSON.stringify({ userId, event, data }));
            }
        })
    })
};

// Override the socket utility cache before requiring workers
require.cache[require.resolve('./utils/socket')] = {
    exports: socketUtilMock
};

// Load all 4 workers from the root /workers/ directory
require('../workers/transcriptionWorker');
require('../workers/summarizationWorker');
require('../workers/searchWorker');
require('../workers/reportGenWorker');

console.log('[Worker Node] All 4 BullMQ workers are actively listening for jobs on Redis.');
console.log('  → transcription | summarization | search | report-generation');
