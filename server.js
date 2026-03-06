// Add these two lines at the very top of server.js
process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

// Database connection pool - Render compatible
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