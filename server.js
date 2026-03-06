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

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// ============= RENDER-SPECIFIC DATABASE CONFIGURATION =============
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    // Enable SSL for Render's PostgreSQL
    ssl: process.env.NODE_ENV === 'production' ? { 
        rejectUnauthorized: false // Required for Render
    } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000, // Increased timeout for Render
});

// Test database connection with better error handling
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error connecting to database:', err.message);
        console.error('🔍 Check your environment variables:');
        console.error('   DB_HOST:', process.env.DB_HOST);
        console.error('   DB_USER:', process.env.DB_USER);
        console.error('   DB_NAME:', process.env.DB_NAME);
        console.error('   DB_PORT:', process.env.DB_PORT);
    } else {
        console.log('✅ Successfully connected to PostgreSQL database');
        release();
    }
});

// ============= RENDER-SPECIFIC CORS CONFIGURATION =============
// Allow requests from your frontend domains
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://earth-resources-frontend.onrender.com', // Your Render frontend
    'https://earth-resources-engineers.vercel.app',  // Your Vercel frontend
    process.env.FRONTEND_URL // Add your custom domain here
].filter(Boolean);

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true, // Allow cookies/session
    optionsSuccessStatus: 200
}));

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ============= RENDER-SPECIFIC SESSION CONFIGURATION =============
// Use PostgreSQL for session storage in production (instead of MemoryStore)
const pgSession = require('connect-pg-simple')(session);

app.use(session({
    store: process.env.NODE_ENV === 'production' 
        ? new pgSession({
            pool: pool,                // Use your existing pool
            tableName: 'user_sessions', // Create this table
            createTableIfMissing: true  // Automatically create session table
        })
        : new session.MemoryStore(),    // MemoryStore for development only
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true,
        maxAge: parseInt(process.env.SESSION_EXPIRY) || 30 * 24 * 60 * 60 * 1000 // 30 days
    },
    // Trust proxy - required for Render's load balancer
    proxy: process.env.NODE_ENV === 'production'
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'public/uploads/';
        // Create directory if it doesn't exist
        const fs = require('fs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|mov/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images and videos are allowed'));
        }
    }
});

// Make database pool and upload available to routes
app.locals.pool = pool;
app.locals.upload = upload;

// Import routes
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

// Use routes
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// Serve main HTML pages
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

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: pool.connected ? 'connected' : 'checking'
    });
});

// API health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📁 Public directory: ${path.join(__dirname, 'public')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        pool.end(() => {
            console.log('Database pool closed');
            process.exit(0);
        });
    });
});

module.exports = { app, pool };