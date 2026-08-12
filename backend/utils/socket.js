// backend/utils/socket.js
let io;

// Minimal cookie-header parser - avoids pulling in a new dependency just to read one value.
const getCookie = (cookieHeader, name) => {
    if (!cookieHeader) return null;
    const match = cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
};

module.exports = {
    init: (httpServer) => {
        const { Server } = require('socket.io');
        const jwt = require('jsonwebtoken');
        const User = require('../models/User');

        io = new Server(httpServer, {
            cors: {
                origin: function (origin, callback) {
                    if (!origin) return callback(null, true);
                    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
                        return callback(null, true);
                    }
                    const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || '')
                        .split(',').map((o) => o.trim()).filter(Boolean);
                    if (allowedOrigins.includes(origin)) return callback(null, true);
                    callback(new Error('Not allowed by CORS'));
                },
                methods: ["GET", "POST"],
                credentials: true
            }
        });

        // Verify the caller's identity from their HttpOnly refreshToken cookie (every
        // frontend socket connection already uses withCredentials:true, so this requires
        // no client-side changes). A client-supplied userId is NEVER trusted for room
        // membership - without this, anyone could join any other user's room and read
        // their real-time transcripts, summaries, notifications, and support messages.
        io.use((socket, next) => {
            try {
                const refreshToken = getCookie(socket.handshake.headers.cookie, 'refreshToken');
                if (!refreshToken) return next(new Error('Unauthorized: no refresh token'));

                const decoded = jwt.verify(refreshToken, process.env.JWT_PRIVATE_KEY);
                socket.userId = decoded.sub;
                next();
            } catch (err) {
                next(new Error('Unauthorized: invalid or expired token'));
            }
        });

        io.on('connection', (socket) => {
            console.log(`[Socket] Client connected: ${socket.id} (user: ${socket.userId})`);

            // Auto-join the verified user's own room immediately - this is the only
            // identity trusted here, derived from the JWT, never from client input.
            socket.join(socket.userId);

            // Client 'join' calls (legacy/no-op for the personal room, and the gate for
            // the shared admin_support room) - any other requested room is silently ignored.
            socket.on('join', async (room) => {
                if (!room || room === socket.userId) return;
                if (room === 'admin_support') {
                    const user = await User.findById(socket.userId).select('roleId').populate('roleId', 'permissions');
                    if (user?.roleId?.permissions?.includes('support.manage_all')) {
                        socket.join('admin_support');
                    }
                }
            });

            socket.on('disconnect', () => {
                console.log(`[Socket] Client disconnected: ${socket.id}`);
            });
        });

        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error("Socket.io not initialized!");
        }
        return io;
    }
};
