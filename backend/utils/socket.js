// backend/utils/socket.js
let io;

module.exports = {
    init: (httpServer) => {
        const { Server } = require('socket.io');
        io = new Server(httpServer, {
            cors: {
                origin: process.env.CLIENT_URL || 'http://localhost:5174',
                methods: ["GET", "POST"],
                credentials: true
            }
        });

        io.on('connection', (socket) => {
            console.log(`[Socket] Client connected: ${socket.id}`);

            // The client emits 'join' with their userId after successful login
            socket.on('join', (userId) => {
                socket.join(userId);
                console.log(`[Socket] Client ${socket.id} joined room for user: ${userId}`);
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
