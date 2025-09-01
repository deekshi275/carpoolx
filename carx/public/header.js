// Header component with notification badge
class Header extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.innerHTML = `
            <header>
                <div class="logo">
                    <div class="logo-icons">
                        <i class="fas fa-car"></i>
                        <i class="fas fa-user-friends"></i>
                    </div>
                    <span>RideShare</span>
                </div>
                <nav>
                    <ul>
                        <li><a href="/" class="nav-link"><i class="fas fa-home"></i> Home</a></li>
                        <li><a href="/publish" class="nav-link"><i class="fas fa-plus-circle"></i> Publish</a></li>
                        <li><a href="/search" class="nav-link"><i class="fas fa-search"></i> Search</a></li>
                        <li>
                            <a href="/notifications" class="nav-link">
                                <i class="fas fa-bell"></i> Notifications
                                <span class="notification-badge" id="notificationBadge">0</span>
                            </a>
                        </li>
                        <li><a href="/profile" class="nav-link"><i class="fas fa-user"></i> Profile</a></li>
                    </ul>
                </nav>
            </header>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .notification-badge {
                position: absolute;
                top: -8px;
                right: -8px;
                background: #e74c3c;
                color: white;
                border-radius: 50%;
                padding: 2px 6px;
                font-size: 0.7rem;
                font-weight: bold;
                display: none;
            }

            .notification-badge.show {
                display: inline-block;
            }

            nav ul li {
                position: relative;
            }

            nav ul li a {
                position: relative;
            }

            .logo {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 1.5rem;
                font-weight: bold;
                color: #2c3e50;
            }

            .logo-icons {
                display: flex;
                align-items: center;
                gap: 0.25rem;
                position: relative;
            }

            .logo-icons i {
                color: #3498db;
                font-size: 1.4rem;
                transition: transform 0.3s ease;
            }

            .logo-icons i.fa-car {
                transform: translateX(-2px);
            }

            .logo-icons i.fa-user-friends {
                transform: translateX(2px);
                font-size: 1.2rem;
            }

            .logo:hover .logo-icons i.fa-car {
                transform: translateX(-4px);
            }

            .logo:hover .logo-icons i.fa-user-friends {
                transform: translateX(4px);
            }

            .logo span {
                background: linear-gradient(45deg, #3498db, #2c3e50);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                font-weight: 700;
            }
        `;
        document.head.appendChild(style);

        // Set active nav link
        const currentPath = window.location.pathname;
        const navLinks = this.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });

        // Check authentication and load notification count
        const token = localStorage.getItem('token');
        if (token) {
            this.loadNotificationCount();
        }
    }

    async loadNotificationCount() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/rides', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const rides = await response.json();

            let totalPendingRequests = 0;
            for (const ride of rides) {
                const requestsResponse = await fetch(`/api/rides/${ride._id}/booking-requests`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const requests = await requestsResponse.json();
                totalPendingRequests += requests.filter(req => req.status === 'pending').length;
            }

            const badge = this.querySelector('#notificationBadge');
            if (totalPendingRequests > 0) {
                badge.textContent = totalPendingRequests;
                badge.classList.add('show');
            } else {
                badge.classList.remove('show');
            }
        } catch (error) {
            console.error('Error loading notification count:', error);
        }
    }
}

customElements.define('app-header', Header); 