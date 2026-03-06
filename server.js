// Add these two lines at the very top of server.js
process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

// ============= REQUIRED IMPORTS =============
const express = require('express');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');        // ← THIS LINE WAS MISSING!
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// ============= DATABASE CONNECTION =============
// Now Pool is defined because we imported it above!
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    ssl: process.env.NODE_ENV === 'production' ? { 
        rejectUnauthorized: false // Required for Render
    } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

// Log connection info (without password)
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

// ... rest of your server.js continues here ...

// ============= SERVER START =============
const PORT = process.env.PORT || 3000;
console.log('🔧 Attempting to start server on port:', PORT);

try {
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ SUCCESS! Server running on port ${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 URL: http://0.0.0.0:${PORT}`);
    });

    server.on('error', (error) => {
        console.error('❌ Server error:', error);
    });

} catch (error) {
    console.error('❌ Failed to start server:', error);
}

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