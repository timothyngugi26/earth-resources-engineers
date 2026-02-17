const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Get team members with their skills
router.get('/team', async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        
        // Get all active team members
        const teamResult = await pool.query(`
            SELECT 
                tm.*,
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
        
        res.json({
            success: true,
            data: teamResult.rows
        });
    } catch (error) {
        console.error('Error fetching team:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Get single team member by ID
router.get('/team/:id', async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT 
                tm.*,
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
            return res.status(404).json({ success: false, error: 'Team member not found' });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching team member:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Get all services
router.get('/services', async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        
        const result = await pool.query(`
            SELECT * FROM services 
            WHERE is_active = true 
            ORDER BY display_order, name
        `);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Get gallery items (with optional filtering)
router.get('/gallery', async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const { type, category, featured } = req.query;
        
        let query = `
            SELECT * FROM gallery_items 
            WHERE is_active = true
        `;
        const params = [];
        let paramCount = 1;
        
        if (type) {
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
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching gallery:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Submit contact form
router.post('/contact', [
    body('name').notEmpty().trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('phone').optional().trim(),
    body('service_interest').optional().trim(),
    body('message').notEmpty().trim().escape()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }
        
        const pool = req.app.locals.pool;
        const { name, email, phone, service_interest, message } = req.body;
        
        const result = await pool.query(`
            INSERT INTO contact_messages (name, email, phone, service_interest, message)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [name, email, phone, service_interest, message]);
        
        // Here you could also send an email notification
        
        res.json({
            success: true,
            message: 'Message sent successfully',
            id: result.rows[0].id
        });
    } catch (error) {
        console.error('Error saving contact message:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Get all skills (for filtering/search)
router.get('/skills', async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        
        const result = await pool.query(`
            SELECT * FROM skills 
            ORDER BY category, name
        `);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching skills:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Get gallery statistics
router.get('/gallery/stats', async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN media_type = 'photo' THEN 1 END) as photos,
                COUNT(CASE WHEN media_type = 'video' THEN 1 END) as videos,
                COUNT(CASE WHEN is_featured THEN 1 END) as featured
            FROM gallery_items
            WHERE is_active = true
        `);
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching gallery stats:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

module.exports = router;