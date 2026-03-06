// After your middleware (cors, express.json, session, etc.)

// ============= STATIC FILES =============
// Serve static files from public directory (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// ============= HEALTH CHECKS =============
app.get('/health', (req, res) => {
    res.json({ status: 'OK', database: 'connected' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
});

// ============= API ROUTES =============
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// ============= HTML PAGE ROUTES =============
// Serve the main frontend from views folder
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

// ============= SERVE FRONTEND =============
// Serve the main HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Serve admin login page
app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

// ============= 404 HANDLER =============
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});