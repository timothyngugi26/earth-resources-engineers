// ==================== AUTO-DETECT API BASE URL ====================
// This automatically works for both local development and production
const API_BASE_URL = ''; // Keep empty - uses same origin

// Optional: Add this to verify the API is reachable
async function checkAPIHealth() {
    try {
        const response = await fetch('/api/health');
        if (response.ok) {
            console.log('✅ API is healthy and connected');
            return true;
        }
    } catch (error) {
        console.log('⚠️ API not reachable, using mock data');
        return false;
    }
}


// API Service for Earth Resources Engineers - Render Compatible
// With mock data fallback for when backend is still setting up

// ==================== CONFIGURATION ====================
// Set your Render backend URL here after deployment
// For local development, use empty string or 'http://localhost:3000'
const API_BASE_URL = ''; // Change to your Render URL when deployed: 'https://earth-resources-backend.onrender.com'

// ==================== MOCK DATA ====================
const MOCK_DATA = {
    team: [
        {
            id: 1,
            name: 'Elena Cruz',
            title: 'Senior Hydrogeologist',
            bio: '15+ years experience in groundwater modelling across Africa and South America. Expert in aquifer mapping and sustainable yield assessment.',
            email: 'elena@earthresources.com',
            avatar_url: null,
            skills: [
                { skill_name: 'Groundwater Modelling' }, 
                { skill_name: 'Pumping Tests' }, 
                { skill_name: 'Water Quality Analysis' }
            ]
        },
        {
            id: 2,
            name: 'Marcus Veld',
            title: 'Geotechnical Engineer',
            bio: 'Expert in soil classification, slope stability, and foundation design for major infrastructure projects.',
            email: 'marcus@earthresources.com',
            avatar_url: null,
            skills: [
                { skill_name: 'Soil Classification' }, 
                { skill_name: 'Geophysical Logging' }, 
                { skill_name: 'Lab Analysis' }
            ]
        },
        {
            id: 3,
            name: 'Samuel Okonkwo',
            title: 'Drilling Operations Manager',
            bio: 'Certified driller with 500+ boreholes completed in 12 countries. Specializes in difficult terrain and deep exploration drilling.',
            email: 'samuel@earthresources.com',
            avatar_url: null,
            skills: [
                { skill_name: 'Core Drilling' }, 
                { skill_name: 'Mud Rotary Drilling' }, 
                { skill_name: 'Borehole Geophysics' }
            ]
        },
        {
            id: 4,
            name: 'Lina Park',
            title: 'Electrical & IT Lead',
            bio: 'Specialist in SCADA systems, automation, and IoT solutions for industrial and environmental monitoring.',
            email: 'lina@earthresources.com',
            avatar_url: null,
            skills: [
                { skill_name: 'SCADA Systems' }, 
                { skill_name: 'PLC Programming' }, 
                { skill_name: 'GIS Mapping' }, 
                { skill_name: 'IoT Solutions' }
            ]
        }
    ],
    
    services: [
        { id: 1, name: 'Hydro Surveys', icon_class: 'fa-droplet', short_description: 'Aquifer mapping, yield assessment, quality analysis' },
        { id: 2, name: 'Soil Surveys', icon_class: 'fa-layer-group', short_description: 'Geotechnical investigations, contamination studies, classification' },
        { id: 3, name: 'Borehole Drilling', icon_class: 'fa-borehole', short_description: 'Exploration, monitoring, and construction drilling' },
        { id: 4, name: 'Electrical Engineering', icon_class: 'fa-bolt', short_description: 'Power distribution, controls, automation, renewable energy' },
        { id: 5, name: 'IT Solutions', icon_class: 'fa-microchip', short_description: 'SCADA, GIS, cloud data, IoT integration' }
    ],
    
    gallery: {
        photos: [
            { id: 1, title: 'Soil Sampling in Nakuru', media_type: 'photo', media_url: 'https://images.unsplash.com/photo-1564424223080-5f9d8d4ab2e7?w=600', category: 'fieldwork' },
            { id: 2, title: 'Drilling Operation - Core Sampling', media_type: 'photo', media_url: 'https://images.unsplash.com/photo-1599064475600-c24f4f40d589?w=600', category: 'drilling' },
            { id: 3, title: 'Electrical Control Panel Installation', media_type: 'photo', media_url: 'https://images.unsplash.com/photo-1628626136029-d1a1eafc8468?w=600', category: 'electrical' },
            { id: 4, title: 'Hydrogeological Survey', media_type: 'photo', media_url: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?w=600', category: 'hydro' },
            { id: 5, title: 'GIS Mapping Session', media_type: 'photo', media_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600', category: 'it' },
            { id: 6, title: 'Geophysical Equipment Setup', media_type: 'photo', media_url: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600', category: 'geophysics' }
        ],
        videos: [
            { id: 7, title: 'Drilling Operation Time-lapse', media_type: 'video', media_url: '#', category: 'drilling', thumbnail_url: null },
            { id: 8, title: 'Pump Testing Procedure', media_type: 'video', media_url: '#', category: 'hydro', thumbnail_url: null }
        ]
    }
};

// ==================== API SERVICE WITH FALLBACK ====================
const API = {
    // Dynamically set base URL - empty for same-origin, or full URL for Render
    baseUrl: API_BASE_URL,
    
    // Helper to handle fetch with fallback
    async fetchWithFallback(url, options = {}, mockData) {
        // Try the actual API first
        try {
            const fullUrl = this.baseUrl ? `${this.baseUrl}${url}` : url;
            console.log(`🌐 Fetching: ${fullUrl}`);
            
            const response = await fetch(fullUrl, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`✅ API success: ${url}`);
            return { 
                success: true, 
                data: data.data || data,
                usingMock: false 
            };
        } catch (error) {
            console.warn(`⚠️ API call failed (${url}), using mock data:`, error.message);
            
            // Return mock data as fallback with a slight delay to simulate network
            return { 
                success: true, 
                data: mockData,
                usingMock: true // Flag to indicate mock data is being used
            };
        }
    },
    
    // Team members
    async getTeam() {
        return this.fetchWithFallback('/api/team', {}, MOCK_DATA.team);
    },
    
    async getTeamMember(id) {
        const mockMember = MOCK_DATA.team.find(m => m.id === parseInt(id)) || MOCK_DATA.team[0];
        return this.fetchWithFallback(`/api/team/${id}`, {}, mockMember);
    },
    
    // Services
    async getServices() {
        return this.fetchWithFallback('/api/services', {}, MOCK_DATA.services);
    },
    
    // Gallery
    async getGallery(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `/api/gallery${queryString ? `?${queryString}` : ''}`;
        
        // Filter mock data based on params
        let mockGallery = [...MOCK_DATA.gallery.photos, ...MOCK_DATA.gallery.videos];
        if (params.type && params.type !== 'all') {
            mockGallery = mockGallery.filter(item => item.media_type === params.type);
        }
        
        return this.fetchWithFallback(url, {}, mockGallery);
    },
    
    // Contact - special handling for POST
    async submitContact(formData) {
        try {
            const fullUrl = this.baseUrl ? `${this.baseUrl}/api/contact` : '/api/contact';
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) throw new Error('Server error');
            
            const data = await response.json();
            console.log('✅ Contact form submitted successfully');
            
            // Show success notification
            showNotification('Message sent successfully! We\'ll respond within 24 hours.', 'success');
            return { success: true, data, usingMock: false };
            
        } catch (error) {
            console.warn('⚠️ Contact form failed, saving locally:', error.message);
            
            // Store in localStorage as fallback
            try {
                const messages = JSON.parse(localStorage.getItem('contact_messages') || '[]');
                messages.push({
                    ...formData,
                    date: new Date().toISOString(),
                    id: Date.now()
                });
                localStorage.setItem('contact_messages', JSON.stringify(messages));
                console.log('📝 Contact form saved to localStorage');
            } catch (storageError) {
                console.error('Failed to save to localStorage:', storageError);
            }
            
            showNotification('Message saved locally. We\'ll connect when backend is ready!', 'success');
            return { success: true, usingMock: true };
        }
    },
    
    // Skills
    async getSkills() {
        // Generate skills from mock data
        const skillSet = new Set();
        MOCK_DATA.team.forEach(member => {
            member.skills.forEach(skill => {
                skillSet.add(skill.skill_name);
            });
        });
        
        const skills = Array.from(skillSet).map((name, index) => ({ 
            id: index + 1, 
            name,
            category: 'general'
        }));
        
        return this.fetchWithFallback('/api/skills', {}, skills);
    }
};

// ==================== ADMIN API (for future use) ====================
const AdminAPI = {
    baseUrl: API_BASE_URL ? `${API_BASE_URL}/admin` : '/admin',
    
    async login(credentials) {
        try {
            const response = await fetch(`${this.baseUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            return await response.json();
        } catch (error) {
            console.warn('⚠️ Admin login unavailable:', error.message);
            showNotification('Admin panel coming soon! Please check back later.', 'info');
            return { success: false, error: 'Backend not available', usingMock: true };
        }
    },
    
    async checkAuth() {
        try {
            const response = await fetch(`${this.baseUrl}/check-auth`);
            return await response.json();
        } catch (error) {
            return { success: false, usingMock: true };
        }
    },
    
    async logout() {
        try {
            const response = await fetch(`${this.baseUrl}/logout`, { method: 'POST' });
            return await response.json();
        } catch (error) {
            return { success: false, usingMock: true };
        }
    }
};

// ==================== UI UPDATE FUNCTIONS ====================

// Load services
async function loadServices() {
    const container = document.getElementById('services-grid');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Loading services...</div>';
    
    try {
        const result = await API.getServices();
        if (result.success) {
            container.innerHTML = result.data.map(service => `
                <div class="service-card">
                    <i class="fas ${service.icon_class || 'fa-cog'}"></i>
                    <h3>${service.name}</h3>
                    <p>${service.short_description || service.description || ''}</p>
                </div>
            `).join('');
            
            // Show notification if using mock data
            if (result.usingMock) {
                showNotification('📢 Showing sample services - backend coming soon!', 'info');
            }
        }
    } catch (error) {
        console.error('Error loading services:', error);
        container.innerHTML = '<p class="error">Unable to load services</p>';
    }
}

// Load team members
async function loadTeamMembers() {
    const container = document.getElementById('team-profiles');
    if (!container) return;
    
    // Show loading state
    container.innerHTML = '<div class="loading">Loading team profiles...</div>';
    
    try {
        const result = await API.getTeam();
        if (result.success) {
            displayTeamMembers(result.data);
            
            // Show notification if using mock data
            if (result.usingMock) {
                showNotification('📢 Showing sample team profiles - backend coming soon!', 'info');
            }
        }
    } catch (error) {
        console.error('Error loading team:', error);
        container.innerHTML = '<p class="error">Unable to load team profiles</p>';
    }
}

function displayTeamMembers(team) {
    const container = document.getElementById('team-profiles');
    if (!container) return;
    
    if (!team || team.length === 0) {
        container.innerHTML = '<p>No team members found</p>';
        return;
    }
    
    container.innerHTML = team.map(member => `
        <div class="profile-card">
            <div class="profile-avatar">
                ${member.avatar_url 
                    ? `<img src="${member.avatar_url}" alt="${member.name}">` 
                    : `<i class="fas fa-user-tie"></i>`
                }
            </div>
            <h4>${member.name}</h4>
            <div class="title">${member.title}</div>
            <div class="skill-badge">
                ${(member.skills || []).map(skill => 
                    `<span>${skill.skill_name || skill.name || skill}</span>`
                ).join('')}
            </div>
            <p>${member.bio || ''}</p>
        </div>
    `).join('');
}

// Load gallery
async function loadGallery(type = 'all') {
    const photoContainer = document.getElementById('photo-grid');
    const videoContainer = document.getElementById('video-grid');
    
    if (!photoContainer || !videoContainer) return;
    
    // Show loading states
    photoContainer.innerHTML = '<div class="loading">Loading photos...</div>';
    videoContainer.innerHTML = '<div class="loading">Loading videos...</div>';
    
    try {
        const params = type !== 'all' ? { type } : {};
        const result = await API.getGallery(params);
        
        if (result.success) {
            displayGallery(result.data);
        }
    } catch (error) {
        console.error('Error loading gallery:', error);
        photoContainer.innerHTML = '<p class="error">Unable to load gallery</p>';
        videoContainer.innerHTML = '';
    }
}

function displayGallery(items) {
    const photoContainer = document.getElementById('photo-grid');
    const videoContainer = document.getElementById('video-grid');
    
    if (!photoContainer || !videoContainer) return;
    
    const photos = items.filter(item => item.media_type === 'photo');
    const videos = items.filter(item => item.media_type === 'video');
    
    // Display photos
    if (photos.length > 0) {
        photoContainer.innerHTML = photos.map(item => `
            <div class="media-card">
                <img src="${item.media_url}" alt="${item.title}" loading="lazy">
                <div class="caption">${item.title}</div>
            </div>
        `).join('');
    } else {
        photoContainer.innerHTML = '<p class="no-content">No photos available</p>';
    }
    
    // Display videos
    if (videos.length > 0) {
        videoContainer.innerHTML = videos.map(item => `
            <div class="media-card">
                <div class="video-placeholder" style="height:200px; background:#2d3a2d; display:flex; align-items:center; justify-content:center; color:white; flex-direction:column;">
                    <i class="fas fa-video" style="font-size:3rem; margin-bottom:0.5rem;"></i>
                    <span>${item.title}</span>
                    <small style="margin-top:0.5rem; color:#b48b5a;">Video coming soon</small>
                </div>
                <div class="caption">${item.title}</div>
            </div>
        `).join('');
    } else {
        videoContainer.innerHTML = '<p class="no-content">No videos available</p>';
    }
}

// Contact form handler
async function handleContactSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = {
        name: form.name.value,
        email: form.email.value,
        phone: form.phone.value,
        service_interest: form.service_interest?.value,
        message: form.message.value
    };
    
    // Validate required fields
    if (!formData.name || !formData.email || !formData.message) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
    try {
        const result = await API.submitContact(formData);
        if (result.success) {
            form.reset();
        }
    } catch (error) {
        console.error('Contact form error:', error);
        showNotification('Network error - please try again', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196F3'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        background: ${colors[type] || colors.info};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        font-weight: 500;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    
    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideIn 0.3s reverse';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Gallery filter setup
function setupGalleryFilters() {
    const filterButtons = document.querySelectorAll('.gallery-filter');
    if (!filterButtons.length) return;
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update active button
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const type = btn.dataset.type;
            loadGallery(type);
        });
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Earth Resources Engineers - Frontend Initialized');
    console.log(`🌐 API Base URL: ${API_BASE_URL || 'Same-origin (local)'}`);
    
    // Load all data
    loadServices();
    loadTeamMembers();
    loadGallery('all');
    
    // Setup gallery filters
    setupGalleryFilters();
    
    // Contact form
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
    }
    
    // Smooth scrolling for navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const target = document.querySelector(targetId);
            if (target) {
                target.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Check if we're online/offline
    window.addEventListener('online', () => {
        showNotification('🟢 Back online - refreshing data...', 'success');
        loadTeamMembers();
        loadGallery('all');
    });
    
    window.addEventListener('offline', () => {
        showNotification('🔴 You are offline - showing cached data', 'warning');
    });
});

// Export for use in other modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API, AdminAPI, MOCK_DATA };
}