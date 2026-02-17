const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ success: false, error: 'Authentication required' });
    }
};

// Admin login
router.post('/login', async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const { username, password } = req.body;
        
        // Check if admin user exists
        const result = await pool.query(
            'SELECT * FROM admin_users WHERE username = $1',
            [username]
        );
        
        if (result.rows.length === 0) {
            // If no admin user exists, create default one
            if (username === process.env.ADMIN_USERNAME && 
                password === process.env.ADMIN_PASSWORD) {
                
                const hashedPassword = await bcrypt.hash(password, 10);
                await pool.query(
                    'INSERT INTO admin_users (username, password_hash, email) VALUES ($1, $2, $3)',
                    [username, hashedPassword, 'admin@earthresources.com']
                );
                
                // Get the new user
                const newUser = await pool.query(
                    'SELECT * FROM admin_users WHERE username = $1',
                    [username]
                );
                
                req.session.userId = newUser.rows[0].id;
                req.session.username = username;
                
                return res.json({ success: true, message: 'Default admin created and logged in' });
            } else {
                return res.status(401).json({ success: false, error: 'Invalid credentials' });
            }
        }
        
        // Verify password
        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        // Update last login
        await pool.query(
            'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );
        
        req.session.userId = user.id;
        req.session.username = user.username;
        
        res.json({ success: true, message: 'Login successful' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Check auth status
router.get('/check-auth', requireAuth, (req, res) => {
    res.json({ 
        success: true, 
        user: { 
            id: req.session.userId, 
            username: req.session.username 
        } 
    });
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out' });
});

// Get all team members (admin version)
router.get('/team', requireAuth, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        
        const result = await pool.query(`
            SELECT 
                tm.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'skill_id', s.id,
                            'skill_name', s.name
                        )
                    ) FILTER (WHERE s.id IS NOT NULL), 
                    '[]'::json
                ) as skills
            FROM team_members tm
            LEFT JOIN team_member_skills tms ON tm.id = tms.team_member_id
            LEFT JOIN skills s ON tms.skill_id = s.id
            GROUP BY tm.id
            ORDER BY tm.display_order, tm.name
        `);
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching team:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Add team member
router.post('/team', requireAuth, upload.single('avatar'), async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const { name, title, email, bio, is_active } = req.body;
        const avatar_url = req.file ? `/uploads/${req.file.filename}` : null;
        
        const result = await pool.query(`
            INSERT INTO team_members (name, title, email, bio, avatar_url, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [name, title, email, bio, avatar_url, is_active === 'true']);
        
        // Handle skills if provided
        if (req.body.skills) {
            const skills = JSON.parse(req.body.skills);
            const teamMemberId = result.rows[0].id;
            
            for (const skill of skills) {
                await pool.query(`
                    INSERT INTO team_member_skills (team_member_id, skill_id)
                    VALUES ($1, $2)
                `, [teamMemberId, skill.id]);
            }
        }
        
        res.json({ success: true, message: 'Team member added', id: result.rows[0].id });
    } catch (error) {
        console.error('Error adding team member:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Update team member
router.put('/team/:id', requireAuth, upload.single('avatar'), async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const { id } = req.params;
        const { name, title, email, bio, is_active } = req.body;
        
        let query = `
            UPDATE team_members 
            SET name = $1, title = $2, email = $3, bio = $4, is_active = $5
        `;
        const params = [name, title, email, bio, is_active === 'true'];
        
        if (req.file) {
            query += `, avatar_url = $6 WHERE id = $7 RETURNING id`;
            params.push(`/uploads/${req.file.filename}`, id);
        } else {
            query += ` WHERE id = $6 RETURNING id`;
            params.push(id);
        }
        
        await pool.query(query, params);
        
        // Update skills
        if (req.body.skills) {
            // Remove old skills
            await pool.query('DELETE FROM team_member_skills WHERE team_member_id = $1', [id]);
            
            // Add new skills
            const skills = JSON.parse(req.body.skills);
            for (const skill of skills) {
                await pool.query(`
                    INSERT INTO team_member_skills (team_member_id, skill_id)
                    VALUES ($1, $2)
                `, [id, skill.id]);
            }
        }
        
        res.json({ success: true, message: 'Team member updated' });
    } catch (error) {
        console.error('Error updating team member:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Delete team member
router.delete('/team/:id', requireAuth, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const { id } = req.params;
        
        await pool.query('UPDATE team_members SET is_active = false WHERE id = $1', [id]);
        
        res.json({ success: true, message: 'Team member deleted' });
    } catch (error) {
        console.error('Error deleting team member:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Get messages
router.get('/messages', requireAuth, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const result = await pool.query(`
            SELECT * FROM contact_messages 
            ORDER BY created_at DESC
        `);
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// Mark message as read
router.patch('/messages/:id/read', requireAuth, async (req, res) => {
    try {
        const pool = req.app.locals.pool;
        const { id } = req.params;
        
        await pool.query(
            'UPDATE contact_messages SET is_read = true WHERE id = $1',
            [id]
        );
        
        res.json({ success: true, message: 'Message marked as read' });
    } catch (error) {
        console.error('Error updating message:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

module.exports = router;