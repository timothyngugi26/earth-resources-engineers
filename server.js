// Add these two lines at the very top for error handling
process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

// ============= REQUIRED IMPORTS =============
const express = require('express');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const pgSession = require('connect-pg-simple')(session);

// Load environment variables
dotenv.config();

// ============= INITIALIZE EXPRESS APP =============
const app = express();  // ← THIS WAS MISSING!

// ============= DATABASE CONNECTION =============
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    ssl: process.env.NODE_ENV === 'production' ? { 
        rejectUnauthorized: false 
    } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

// Log connection info
console.log('📊 Database configuration:', {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    port: process.env.DB_PORT,
    ssl: process.env.NODE_ENV === 'production'
});

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error connecting to database:', err.message);
    } else {
        console.log('✅ Successfully connected to PostgreSQL database');
        release();
    }
});

// Make database pool available to routes
app.locals.pool = pool;

// ============= MIDDLEWARE =============
app.use(helmet({ contentSecurityPolicy: false }));

// CORS configuration
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://earth-resources-frontend.onrender.com',
    'https://earth-resources-engineers.vercel.app',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'CORS policy does not allow access from this origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============= SESSION CONFIGURATION =============
app.use(session({
    store: process.env.NODE_ENV === 'production' 
        ? new pgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true })
        : new session.MemoryStore(),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000
    },
    proxy: process.env.NODE_ENV === 'production'
}));

// ============= STATIC FILES =============
app.use(express.static(path.join(__dirname, 'public')));

// ============= HEALTH CHECKS =============
app.get('/health', (req, res) => {
    res.json({ status: 'OK', database: 'connected' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
});

// ============= IMPORT ROUTES =============
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

// ============= API ROUTES =============
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// ============= HTML PAGE ROUTES =============
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/admin-login', (req, res) => {
    if (req.session.userId) {
        res.redirect('/admin/dashboard');
    } else {
        res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
    }
});

// ============= 404 HANDLER =============
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// ============= ERROR HANDLER =============
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// ============= START SERVER =============
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received: closing server');
    server.close(() => {
        pool.end(() => {
            console.log('Database pool closed');
            process.exit(0);
        });
    });
});

module.exports = { app, pool };