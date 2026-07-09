const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Security Middleware
app.use(helmet());

// CORS configuration (Credentials allowed for HttpOnly cookies)
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser with 1MB limit for DoS prevention
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
// Serve local files so the frontend can play them back
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- ROUTES WILL GO HERE ---
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/users', require('./routes/userRoutes'));
app.use('/api/v1/recordings', require('./routes/recordingRoutes'));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));