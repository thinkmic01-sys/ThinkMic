const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();
require('./config/validateEnv')();

// Connect to database
connectDB();

const app = express();

// Security Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration (Credentials allowed for HttpOnly cookies).
// ALLOWED_ORIGINS supports a comma-separated list for multi-domain production setups
// (e.g. apex + www, or a staging URL); falls back to the single CLIENT_URL if unset.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // No Origin header - server-to-server, curl, mobile clients, etc.
        if (!origin) return callback(null, true);
        // Local development convenience only - never trusted in production.
        if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser with 1MB limit for DoS prevention
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
// Serve local files so the frontend can play them back
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- ROUTES ---
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/users', require('./routes/userRoutes'));
app.use('/api/v1/recordings', require('./routes/recordingRoutes'));
app.use('/api/v1/transcriptions', require('./routes/transcriptionRoutes'));
app.use('/api/v1/summaries', require('./routes/summarizationRoutes'));
app.use('/api/v1/search', require('./routes/searchRoutes'));
app.use('/api/v1/reports', require('./routes/reportsRoutes'));
app.use('/api/v1/projects', require('./routes/projectsRoutes'));
app.use('/api/v1/schemas', require('./routes/schemasRoutes'));
app.use('/api/v1/submissions', require('./routes/submissionsRoutes'));
app.use('/api/v1/analytics', require('./routes/analyticsRoutes'));
app.use('/api/v1/exports', require('./routes/exportsRoutes'));
app.use('/api/v1/admin', require('./routes/adminRoutes'));
app.use('/api/v1/notes', require('./routes/notesRoutes'));
app.use('/api/v1/seminars', require('./routes/seminarsRoutes'));
app.use('/api/v1/courses', require('./routes/coursesRoutes'));
app.use('/api/v1/collaboration', require('./routes/collaborationRoutes'));
app.use('/api/v1/achievements', require('./routes/achievementsRoutes'));
app.use('/api/v1/upload', require('./routes/uploadRoutes'));
app.use('/api/v1/notifications', require('./routes/notificationsRoutes'));
app.use('/api/v1/support', require('./routes/supportRoutes'));
app.use('/api/v1/deepgram', require('./routes/deepgramRoutes'));

// 404 for anything that didn't match a mounted route
app.use((req, res) => {
    res.status(404).json({ message: 'Not found' });
});

// Global error handler - must be defined last with 4 args so Express treats it as
// error-handling middleware. Catches anything that reaches next(err) that individual
// route try/catch blocks don't cover (e.g. malformed JSON bodies from express.json()).
// Never leaks internal stack traces to the client, regardless of NODE_ENV.
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err.stack || err);
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({ message: err.message || 'Server Error' });
});

// Initialize Background Jobs
require('./jobs/reminderCron');

const http = require('http');
const socket = require('./utils/socket');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io
socket.init(server);

// Redis Pub/Sub for worker events
const Redis = require('ioredis');
const redisSub = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
redisSub.subscribe('socket_events', (err, count) => {
    if (err) console.error('Failed to subscribe: %s', err.message);
});
redisSub.on('message', (channel, message) => {
    if (channel === 'socket_events') {
        const { userId, event, data } = JSON.parse(message);
        socket.getIO().to(userId).emit(event, data);
    }
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));