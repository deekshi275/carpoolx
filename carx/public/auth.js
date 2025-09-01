// API URL
const API_URL = 'http://localhost:3000/api';

// Check if user is logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = '/';
    }
}

// Add loading animation styles
const style = document.createElement('style');
style.textContent = `
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s, visibility 0.3s;
    }

    .loading-overlay.show {
        opacity: 1;
        visibility: visible;
    }

    .loading-spinner {
        width: 50px;
        height: 50px;
        border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Add loading overlay to the body
const loadingOverlay = document.createElement('div');
loadingOverlay.className = 'loading-overlay';
loadingOverlay.innerHTML = '<div class="loading-spinner"></div>';
document.body.appendChild(loadingOverlay);

// Handle Registration
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullname = document.getElementById('registerFullname').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            const errorMessage = document.getElementById('registerError');
            errorMessage.textContent = 'Passwords do not match';
            errorMessage.style.display = 'block';
            return;
        }

        try {
            // Show loading animation
            loadingOverlay.classList.add('show');
            
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fullname, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                
                // Add a small delay to show the loading animation
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Redirect to home page
                window.location.href = '/';
            } else {
                throw new Error(data.message || 'Registration failed');
            }
        } catch (error) {
            // Hide loading animation
            loadingOverlay.classList.remove('show');
            
            const errorMessage = document.getElementById('registerError');
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
    });
}

// Handle Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            // Show loading animation
            loadingOverlay.classList.add('show');
            
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                
                // Add a small delay to show the loading animation
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Redirect to home page
                window.location.href = '/';
            } else {
                throw new Error(data.message || 'Login failed');
            }
        } catch (error) {
            // Hide loading animation
            loadingOverlay.classList.remove('show');
            
            const errorMessage = document.getElementById('loginError');
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
    });
}

// Handle Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    window.location.href = '/login';
}

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const currentPath = window.location.pathname;

    // If user is on login/register page and is already logged in, redirect to home
    if (token && (currentPath === '/login' || currentPath === '/register')) {
        window.location.href = '/';
    }
    
    // If user is not logged in and trying to access protected pages, redirect to login
    if (!token && currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
        window.location.href = '/login';
    }
}); 