// backend/worker.js
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

console.log('[Worker Node] Booting background processing engine...');

// We need to initialize a dummy socket server or just let the workers silently fail if the HTTP server isn't running in this process?
// Wait, BullMQ workers run in a separate process. The socket server lives in the main API process. 
// If the worker is running in a totally separate node process, it CANNOT directly use `io.to().emit()`!
// To solve this, we should use Redis pub/sub OR Socket.IO Redis Adapter. 
// Since we have Redis already, let's setup Socket.IO Redis emitter so the worker can emit to the API server's socket clients.
// For the sake of this prompt, the easiest path without complex Redis Adapter setup is to run the workers INSIDE the main server process during MVP, 
// OR we can quickly add socket.io-redis. Let's just import the workers here and run them, but we will launch `node server.js` which includes everything for now, or just require them.
// Wait! The user asked: "Should we start the worker processes inside the main server.js automatically, or do you want a separate npm run worker script?"
// And their comment was: "do which is best for this project"
// The best approach for scaling is separate processes using Redis Adapter. But for right now, the MVP approach is running them separately and using Redis Pub/Sub, OR just loading the workers in `worker.js`.
// Let's implement a simple Redis pub/sub for events so `server.js` listens to Redis and emits via Socket.IO.

const Redis = require('ioredis');
const redisPub = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// We will mock socketUtil in the worker process to publish to Redis instead!
const socketUtilMock = {
    getIO: () => ({
        to: (userId) => ({
            emit: (event, data) => {
                // Publish to a Redis channel instead of directly using io
                redisPub.publish('socket_events', JSON.stringify({ userId, event, data }));
            }
        })
    })
};

// Override the socket utility cache before requiring workers
require.cache[require.resolve('./utils/socket')] = {
    exports: socketUtilMock
};

// Require workers to start them
require('./workers/transcriptionWorker');
require('./workers/summaryWorker');

console.log('[Worker Node] BullMQ workers are actively listening for jobs on Redis.');
