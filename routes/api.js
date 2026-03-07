const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// ==================== HELPER FUNCTION FOR ERROR HANDLING ====================
const handleDatabaseError = (error, res, operation) => {
    console.error(`❌ Error during ${operation}:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        table: error.table,
        constraint: error.constraint,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    // Check for specific PostgreSQL error codes
    if (error.code === '42P01') { // Undefined table
        return res.status(500).json({ 
            success: false, 
            error: 'Database tables not set up. Please run database setup.',
            details: 'Tables missing'
        });
    }
    
    if (error.code === '28P01') { // Invalid password
        return res.status(500).json({ 
            success: false, 
            error: 'Database authentication failed',
            details: 'Check database credentials'
        });
    }
    
    if (error.code === 'ECONNREFUSED') {
        return res.status(500).json({ 
            success: false, 
            error: 'Database connection refused',
            details: 'Database server may be down'
        });
    }
    
    // Generic error response
    res.status(500).json({ 
        success: false, 
        error: 'Database error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
    });
};

// ==================== TEAM MEMBERS ROUTES ====================

/**
 * GET /api/team
 * Get all team members with their skills
 */
router.get('/team', async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        
        if (!pool) {
            console.error('❌ Database pool not available');
            return res.status(500).json({ 
                success: false, 
                error: 'Database connection not initialized' 
            });
        }
        
        console.log('📊 Fetching team members...');
        
        // Get all active team members
        const teamResult = await pool.query(`
            SELECT 
                tm.id,
                tm.name,
                tm.title,
                tm.bio,
                tm.email,
                tm.avatar_url,
                tm.display_order,
                tm.created_at,
                tm.is_active,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'skill_name', s.name,
                            'category', s.category,
                            'proficiency', tms.proficiency_level
                        ) ORDER BY s.category, s.name
                    ) FILTER (WHERE s.id IS NOT NULL), 
                    '[]'::json
                ) as skills
            FROM team_members tm
            LEFT JOIN team_member_skills tms ON tm.id = tms.team_member_id
            LEFT JOIN skills s ON tms.skill_id = s.id
            WHERE tm.is_active = true
            GROUP BY tm.id
            ORDER BY tm.display_order, tm.name
        `);
        
        console.log(`✅ Found ${teamResult.rows.length} team members`);
        
        res.json({
            success: true,
            data: teamResult.rows,
            count: teamResult.rows.length
        });
    } catch (error) {
        handleDatabaseError(error, res, 'fetching team members');
    }
});

/**
 * GET /api/team/:id
 * Get a single team member by ID
 */
router.get('/team/:id', async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const { id } = req.params;
        
        // Validate ID
        if (isNaN(parseInt(id))) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid team member ID' 
            });
        }
        
        console.log(`📊 Fetching team member ID: ${id}`);
        
        const result = await pool.query(`
            SELECT 
                tm.id,
                tm.name,
                tm.title,
                tm.bio,
                tm.email,
                tm.avatar_url,
                tm.display_order,
                tm.created_at,
                tm.is_active,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'skill_name', s.name,
                            'category', s.category,
                            'proficiency', tms.proficiency_level
                        ) ORDER BY s.category, s.name
                    ) FILTER (WHERE s.id IS NOT NULL), 
                    '[]'::json
                ) as skills
            FROM team_members tm
            LEFT JOIN team_member_skills tms ON tm.id = tms.team_member_id
            LEFT JOIN skills s ON tms.skill_id = s.id
            WHERE tm.id = $1 AND tm.is_active = true
            GROUP BY tm.id
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Team member not found' 
            });
        }
        
        console.log(`✅ Found team member: ${result.rows[0].name}`);
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        handleDatabaseError(error, res, `fetching team member ID: ${req.params.id}`);
    }
});

// ==================== SERVICES ROUTES ====================

/**
 * GET /api/services
 * Get all services
 */
router.get('/services', async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        
        console.log('📊 Fetching services...');
        
        const result = await pool.query(`
            SELECT 
                id,
                name,
                icon_class,
                short_description,
                full_description,
                display_order,
                is_active
            FROM services 
            WHERE is_active = true 
            ORDER BY display_order, name
        `);
        
        console.log(`✅ Found ${result.rows.length} services`);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        handleDatabaseError(error, res, 'fetching services');
    }
});

// ==================== GALLERY ROUTES ====================

/**
 * GET /api/gallery
 * Get gallery items with optional filtering
 */
router.get('/gallery', async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const { type, category, featured } = req.query;
        
        console.log('📊 Fetching gallery with filters:', { type, category, featured });
        
        let query = `
            SELECT 
                id,
                title,
                description,
                media_type,
                media_url,
                thumbnail_url,
                category,
                display_order,
                is_featured,
                created_at
            FROM gallery_items 
            WHERE is_active = true
        `;
        const params = [];
        let paramCount = 1;
        
        if (type && type !== 'all') {
            query += ` AND media_type = $${paramCount}`;
            params.push(type);
            paramCount++;
        }
        
        if (category) {
            query += ` AND category = $${paramCount}`;
            params.push(category);
            paramCount++;
        }
        
        if (featured === 'true') {
            query += ` AND is_featured = true`;
        }
        
        query += ` ORDER BY display_order, created_at DESC`;
        
        const result = await pool.query(query, params);
        
        console.log(`✅ Found ${result.rows.length} gallery items`);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length,
            filters: { type, category, featured }
        });
    } catch (error) {
        handleDatabaseError(error, res, 'fetching gallery');
    }
});

// ==================== CONTACT FORM ROUTES ====================

/**
 * POST /api/contact
 * Submit a contact form message
 */
router.post('/contact', [
    body('name').notEmpty().withMessage('Name is required').trim().escape(),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('phone').optional().trim().escape(),
    body('service_interest').optional().trim().escape(),
    body('message').notEmpty().withMessage('Message is required').trim().escape()
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('⚠️ Contact form validation errors:', errors.array());
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }
        
        const pool = req.app.locals.pool;
        const { name, email, phone, service_interest, message } = req.body;
        
        console.log('📝 Saving contact form submission from:', email);
        
        const result = await pool.query(`
            INSERT INTO contact_messages (name, email, phone, service_interest, message, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING id, created_at
        `, [name, email, phone, service_interest, message]);
        
        console.log(`✅ Contact form saved with ID: ${result.rows[0].id}`);
        
        // Here you could also send an email notification
        // await sendEmailNotification({ name, email, message });
        
        res.json({
            success: true,
            message: 'Message sent successfully',
            id: result.rows[0].id,
            created_at: result.rows[0].created_at
        });
    } catch (error) {
        handleDatabaseError(error, res, 'saving contact message');
    }
});

// ==================== SKILLS ROUTES ====================

/**
 * GET /api/skills
 * Get all skills
 */
router.get('/skills', async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        
        console.log('📊 Fetching skills...');
        
        const result = await pool.query(`
            SELECT 
                id,
                name,
                category,
                created_at
            FROM skills 
            ORDER BY category, name
        `);
        
        console.log(`✅ Found ${result.rows.length} skills`);
        
        // Group skills by category for easier frontend use
        const skillsByCategory = result.rows.reduce((acc, skill) => {
            if (!acc[skill.category]) {
                acc[skill.category] = [];
            }
            acc[skill.category].push(skill);
            return acc;
        }, {});
        
        res.json({
            success: true,
            data: result.rows,
            grouped: skillsByCategory,
            count: result.rows.length
        });
    } catch (error) {
        handleDatabaseError(error, res, 'fetching skills');
    }
});

// ==================== GALLERY STATISTICS ROUTES ====================

/**
 * GET /api/gallery/stats
 * Get gallery statistics
 */
router.get('/gallery/stats', async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        
        console.log('📊 Fetching gallery statistics...');
        
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN media_type = 'photo' THEN 1 END) as photos,
                COUNT(CASE WHEN media_type = 'video' THEN 1 END) as videos,
                COUNT(CASE WHEN is_featured THEN 1 END) as featured,
                COUNT(DISTINCT category) as categories
            FROM gallery_items
            WHERE is_active = true
        `);
        
        // Get category breakdown
        const categoryStats = await pool.query(`
            SELECT 
                category,
                COUNT(*) as count,
                COUNT(CASE WHEN media_type = 'photo' THEN 1 END) as photos,
                COUNT(CASE WHEN media_type = 'video' THEN 1 END) as videos
            FROM gallery_items
            WHERE is_active = true AND category IS NOT NULL
            GROUP BY category
            ORDER BY category
        `);
        
        console.log('✅ Gallery statistics calculated');
        
        res.json({
            success: true,
            data: {
                totals: result.rows[0],
                byCategory: categoryStats.rows
            }
        });
    } catch (error) {
        handleDatabaseError(error, res, 'fetching gallery statistics');
    }
});

// ==================== HEALTH CHECK ROUTE ====================

/**
 * GET /api/health
 * API health check
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// ==================== DATABASE CHECK ROUTE ====================

/**
 * GET /api/db-check
 * Check database connection and tables (development only)
 */
router.get('/db-check', async (req, res) => {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ success: false, error: 'Not found' });
    }
    
    try {
        const pool = req.app.locals.pool;
        
        // Check connection
        const connectionTest = await pool.query('SELECT NOW() as time');
        
        // Check tables
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        // Get row counts for each table
        const counts = {};
        for (const table of tables.rows) {
            const result = await pool.query(`SELECT COUNT(*) FROM ${table.table_name}`);
            counts[table.table_name] = parseInt(result.rows[0].count);
        }
        
        res.json({
            success: true,
            database: {
                connected: true,
                time: connectionTest.rows[0].time
            },
            tables: tables.rows.map(t => t.table_name),
            counts: counts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database check failed',
            message: error.message
        });
    }
});

module.exports = router;