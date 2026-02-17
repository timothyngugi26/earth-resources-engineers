// API Service for Earth Resources Engineers
const API = {
    baseUrl: '/api',
    
    // Team members
    async getTeam() {
        const response = await fetch(`${this.baseUrl}/team`);
        return response.json();
    },
    
    async getTeamMember(id) {
        const response = await fetch(`${this.baseUrl}/team/${id}`);
        return response.json();
    },
    
    // Services
    async getServices() {
        const response = await fetch(`${this.baseUrl}/services`);
        return response.json();
    },
    
    // Gallery
    async getGallery(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`${this.baseUrl}/gallery?${queryString}`);
        return response.json();
    },
    
    // Contact
    async submitContact(formData) {
        const response = await fetch(`${this.baseUrl}/contact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        return response.json();
    },
    
    // Skills
    async getSkills() {
        const response = await fetch(`${this.baseUrl}/skills`);
        return response.json();
    }
};

// Admin API
const AdminAPI = {
    baseUrl: '/admin',
    
    async login(credentials) {
        const response = await fetch(`${this.baseUrl}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials)
        });
        return response.json();
    },
    
    async logout() {
        const response = await fetch(`${this.baseUrl}/logout`, {
            method: 'POST'
        });
        return response.json();
    },
    
    async checkAuth() {
        const response = await fetch(`${this.baseUrl}/check-auth`);
        return response.json();
    },
    
    // Team management
    async getTeam() {
        const response = await fetch(`${this.baseUrl}/team`);
        return response.json();
    },
    
    async addTeamMember(formData) {
        const response = await fetch(`${this.baseUrl}/team`, {
            method: 'POST',
            body: formData
        });
        return response.json();
    },
    
    async updateTeamMember(id, formData) {
        const response = await fetch(`${this.baseUrl}/team/${id}`, {
            method: 'PUT',
            body: formData
        });
        return response.json();
    },
    
    async deleteTeamMember(id) {
        const response = await fetch(`${this.baseUrl}/team/${id}`, {
            method: 'DELETE'
        });
        return response.json();
    },
    
    // Gallery management
    async getGallery() {
        const response = await fetch(`${this.baseUrl}/gallery`);
        return response.json();
    },
    
    async addGalleryItem(formData) {
        const response = await fetch(`${this.baseUrl}/gallery`, {
            method: 'POST',
            body: formData
        });
        return response.json();
    },
    
    // Messages
    async getMessages(read = null) {
        const url = read !== null ? `${this.baseUrl}/messages?read=${read}` : `${this.baseUrl}/messages`;
        const response = await fetch(url);
        return response.json();
    },
    
    async markMessageRead(id) {
        const response = await fetch(`${this.baseUrl}/messages/${id}/read`, {
            method: 'PATCH'
        });
        return response.json();
    }
};

// UI Update Functions
async function loadTeamMembers() {
    try {
        const result = await API.getTeam();
        if (result.success) {
            displayTeamMembers(result.data);
        }
    } catch (error) {
        console.error('Error loading team:', error);
        showNotification('Error loading team members', 'error');
    }
}

function displayTeamMembers(team) {
    const container = document.getElementById('team-profiles');
    if (!container) return;
    
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
                ${member.skills.map(skill => 
                    `<span>${skill.skill_name}</span>`
                ).join('')}
            </div>
            <p>${member.bio || ''}</p>
        </div>
    `).join('');
}

async function loadGallery(type = null) {
    try {
        const params = type ? { type } : {};
        const result = await API.getGallery(params);
        if (result.success) {
            displayGallery(result.data);
        }
    } catch (error) {
        console.error('Error loading gallery:', error);
        showNotification('Error loading gallery', 'error');
    }
}

function displayGallery(items) {
    const photoContainer = document.getElementById('photo-grid');
    const videoContainer = document.getElementById('video-grid');
    
    if (photoContainer) {
        const photos = items.filter(item => item.media_type === 'photo');
        photoContainer.innerHTML = photos.map(item => `
            <div class="media-card">
                <img src="${item.media_url}" alt="${item.title}" loading="lazy">
                <div class="caption">${item.title}</div>
            </div>
        `).join('');
    }
    
    if (videoContainer) {
        const videos = items.filter(item => item.media_type === 'video');
        videoContainer.innerHTML = videos.map(item => `
            <div class="media-card">
                <video controls preload="metadata" poster="${item.thumbnail_url || item.media_url}">
                    <source src="${item.media_url}" type="video/mp4">
                </video>
                <div class="caption">${item.title}</div>
            </div>
        `).join('');
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
    
    try {
        const result = await API.submitContact(formData);
        if (result.success) {
            showNotification('Message sent successfully!', 'success');
            form.reset();
        } else {
            showNotification('Error sending message', 'error');
        }
    } catch (error) {
        console.error('Contact form error:', error);
        showNotification('Network error', 'error');
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        border-radius: 5px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadTeamMembers();
    loadGallery();
    
    // Contact form
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
    }
    
    // Gallery filters
    const filterButtons = document.querySelectorAll('.gallery-filter');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.dataset.type;
            loadGallery(type);
        });
    });
});