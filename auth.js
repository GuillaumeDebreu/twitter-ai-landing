// Configuration
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://peaceful-happiness-production-ef9d.up.railway.app';

// Global auth state
let currentUser = null;
let authToken = null;

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupAuthListeners();
});

// Check if user is authenticated
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        try {
            authToken = token;
            currentUser = JSON.parse(user);
            
            // Verify token is still valid
            verifyToken(token);
        } catch (error) {
            console.error('Invalid token or user data:', error);
            logout();
        }
    }
}

// Verify token with backend
async function verifyToken(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Token invalid');
        }
        
        const data = await response.json();
        currentUser = data.user;
        updateAuthUI();
    } catch (error) {
        console.error('Token verification failed:', error);
        logout();
    }
}

// Setup auth event listeners
function setupAuthListeners() {
    // Listen for messages from Chrome extension
    try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                if (message.type === 'GET_AUTH_TOKEN') {
                    sendResponse({
                        token: authToken,
                        user: currentUser
                    });
                }
                
                if (message.type === 'LOGOUT') {
                    logout();
                    sendResponse({ success: true });
                }
            });
        }
    } catch (error) {
        console.log('Chrome extension API not available:', error);
    }
    
    // Handle auth callback from extension
    const urlParams = new URLSearchParams(window.location.search);
    const callbackToken = urlParams.get('token');
    
    if (callbackToken) {
        handleAuthCallback(callbackToken);
    }
}

// Handle authentication callback
async function handleAuthCallback(token) {
    try {
        // Store token
        localStorage.setItem('authToken', token);
        authToken = token;
        
        // Get user info
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            // Show success message
            showAuthSuccess();
            
            // Send token to extension
            sendTokenToExtension(token);
        }
    } catch (error) {
        console.error('Auth callback failed:', error);
        showAuthError('Authentication failed');
    }
}

// Send token to Chrome extension
function sendTokenToExtension(token) {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        // Try to send to our extension
        chrome.runtime.sendMessage({
            type: 'AUTH_SUCCESS',
            token: token,
            user: currentUser
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('Extension not available or not installed');
            } else {
                console.log('Token sent to extension successfully');
            }
        });
    }
}

// Update UI based on auth status
function updateAuthUI() {
    // Update navigation
    updateNavigation();
    
    // Update pricing page if on pricing page
    if (window.location.pathname.includes('pricing.html')) {
        updatePricingUI();
    }
}

// Update navigation
function updateNavigation() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;
    
    if (currentUser) {
        // Show logged-in state
        navLinks.innerHTML = `
            <a href="index.html" class="nav-link">Home</a>
            <a href="#features" class="nav-link">Features</a>
            <a href="pricing.html" class="nav-link">Pricing</a>
            <a href="#" class="nav-link" onclick="showUserMenu()">Account</a>
            <a href="#" class="btn btn-secondary btn-sm" onclick="logout()">Log out</a>
        `;
    } else {
        // Show logged-out state
        navLinks.innerHTML = `
            <a href="index.html" class="nav-link">Home</a>
            <a href="#features" class="nav-link">Features</a>
            <a href="pricing.html" class="nav-link">Pricing</a>
            <a href="login.html" class="nav-link nav-link-secondary">Log in</a>
            <a href="signup.html" class="btn btn-primary btn-sm">Sign up</a>
        `;
    }
}

// Update pricing UI
function updatePricingUI() {
    if (!currentUser) return;
    
    // Update CTA buttons
    const ctaButtons = document.querySelectorAll('.btn-full');
    ctaButtons.forEach(btn => {
        if (btn.textContent.includes('Get Started Free')) {
            btn.textContent = 'Go to Dashboard';
            btn.onclick = () => window.location.href = 'https://x.com';
        }
    });
}

// Show user menu
function showUserMenu() {
    if (!currentUser) return;
    
    const plan = currentUser.plan || 'free';
    const usage = currentUser.usage || { currentMonth: 0, limit: 5, remaining: 5 };
    
    const menuHTML = `
        <div class="user-menu">
            <div class="user-info">
                <div class="user-avatar">${currentUser.email.charAt(0).toUpperCase()}</div>
                <div class="user-details">
                    <div class="user-email">${currentUser.email}</div>
                    <div class="user-plan">${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan</div>
                    <div class="user-usage">${usage.currentMonth}/${usage.limit} replies this month</div>
                </div>
            </div>
            <div class="user-actions">
                ${plan === 'free' ? '<a href="pricing.html" class="btn btn-primary btn-sm">Upgrade to Premium</a>' : ''}
                <button class="btn btn-secondary btn-sm" onclick="logout()">Log out</button>
            </div>
        </div>
    `;
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = menuHTML;
    document.body.appendChild(modal);
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Logout function
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    authToken = null;
    currentUser = null;
    
    // Notify extension
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
            type: 'LOGOUT'
        });
    }
    
    // Update UI
    updateAuthUI();
    
    // Redirect to home
    if (!window.location.pathname.includes('index.html')) {
        window.location.href = 'index.html';
    }
}

// Show auth success message
function showAuthSuccess() {
    const successDiv = document.createElement('div');
    successDiv.className = 'auth-notification success';
    successDiv.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">✅</span>
            <span class="notification-text">Successfully authenticated! You can now close this tab.</span>
        </div>
    `;
    
    document.body.appendChild(successDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        successDiv.remove();
    }, 5000);
}

// Show auth error message
function showAuthError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'auth-notification error';
    errorDiv.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">❌</span>
            <span class="notification-text">${message}</span>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// API wrapper functions
class ReplyAI_API {
    constructor(baseURL = API_BASE_URL) {
        this.baseURL = baseURL;
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        // Add auth token if available
        if (authToken) {
            config.headers.Authorization = `Bearer ${authToken}`;
        }
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
    
    // Auth endpoints
    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }
    
    async signup(email, password) {
        return this.request('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }
    
    async getProfile() {
        return this.request('/auth/me');
    }
    
    async upgradePlan() {
        return this.request('/auth/upgrade', {
            method: 'POST'
        });
    }
    
    // Reply endpoints
    async generateReply(tweetText, style, length, language = 'auto') {
        return this.request('/api/generate', {
            method: 'POST',
            body: JSON.stringify({ tweetText, style, length, language })
        });
    }
    
    async translateText(text, targetLanguage) {
        return this.request('/api/translate', {
            method: 'POST',
            body: JSON.stringify({ text, targetLanguage })
        });
    }
    
    async improveText(text, tweetContext, language = 'auto') {
        return this.request('/api/improve', {
            method: 'POST',
            body: JSON.stringify({ text, tweetContext, language })
        });
    }
}

// Create global API instance
window.ReplyAI_API = new ReplyAI_API();

// Export for use in other scripts
window.Auth = {
    currentUser,
    authToken,
    logout,
    checkAuthStatus,
    sendTokenToExtension
};

// Add notification styles
const notificationStyles = `
    .auth-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        border-radius: var(--radius-lg);
        padding: var(--spacing-md);
        max-width: 400px;
        animation: slideIn 0.3s ease;
    }
    
    .auth-notification.success {
        background: var(--bg-card);
        border: 1px solid #10b981;
        color: var(--text-primary);
    }
    
    .auth-notification.error {
        background: var(--bg-card);
        border: 1px solid #ef4444;
        color: var(--text-primary);
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
    }
    
    .notification-icon {
        font-size: var(--font-size-lg);
    }
    
    .notification-text {
        flex: 1;
    }
    
    .user-menu {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius-xl);
        padding: var(--spacing-lg);
        min-width: 300px;
        backdrop-filter: blur(8px);
    }
    
    .user-info {
        display: flex;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-lg);
        padding-bottom: var(--spacing-lg);
        border-bottom: 1px solid var(--border);
    }
    
    .user-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--gradient-2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: var(--font-size-lg);
        color: white;
    }
    
    .user-details {
        flex: 1;
    }
    
    .user-email {
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: var(--spacing-xs);
    }
    
    .user-plan {
        font-size: var(--font-size-sm);
        color: var(--accent);
        margin-bottom: var(--spacing-xs);
    }
    
    .user-usage {
        font-size: var(--font-size-sm);
        color: var(--text-muted);
    }
    
    .user-actions {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }
    
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    }
    
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

// Inject styles
if (!document.getElementById('auth-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'auth-styles';
    styleSheet.textContent = notificationStyles;
    document.head.appendChild(styleSheet);
}
