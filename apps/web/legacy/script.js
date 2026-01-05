// TK Fortini Games - JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Cart counter
    let cartCount = 0;
    const cartCountEl = document.querySelector('.cart-count');

    // Search functionality
    const searchInput = document.querySelector('.search-bar input');
    const searchBtn = document.querySelector('.search-bar button');
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', function() {
            const query = searchInput.value.trim();
            if (query) {
                showNotification(`Buscando por: "${query}"`);
            }
        });

        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                if (query) {
                    showNotification(`Buscando por: "${query}"`);
                }
            }
        });
    }

    // Hero Banner Slider
    const heroDots = document.querySelectorAll('.hero-dots .dot');
    let currentSlide = 0;

    heroDots.forEach((dot, index) => {
        dot.addEventListener('click', function() {
            heroDots.forEach(d => d.classList.remove('active'));
            this.classList.add('active');
            currentSlide = index;
        });
    });

    // Auto-slide for hero banner
    setInterval(() => {
        currentSlide = (currentSlide + 1) % heroDots.length;
        heroDots.forEach(d => d.classList.remove('active'));
        heroDots[currentSlide].classList.add('active');
    }, 5000);

    // Franchises Carousel
    const franchisePrevBtn = document.querySelector('.carousel-btn.prev');
    const franchiseNextBtn = document.querySelector('.carousel-btn.next');
    const carouselDots = document.querySelectorAll('.carousel-dots .dot');
    let currentFranchisePage = 0;

    if (franchisePrevBtn) {
        franchisePrevBtn.addEventListener('click', function() {
            currentFranchisePage = Math.max(0, currentFranchisePage - 1);
            updateCarouselDots();
        });
    }

    if (franchiseNextBtn) {
        franchiseNextBtn.addEventListener('click', function() {
            currentFranchisePage = Math.min(carouselDots.length - 1, currentFranchisePage + 1);
            updateCarouselDots();
        });
    }

    carouselDots.forEach((dot, index) => {
        dot.addEventListener('click', function() {
            currentFranchisePage = index;
            updateCarouselDots();
        });
    });

    function updateCarouselDots() {
        carouselDots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentFranchisePage);
        });
    }

    // Navigation dropdowns
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            // Could add dropdown menu functionality here
        });
    });

    // Notification system
    function showNotification(message, type = 'success') {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '100px',
            right: '20px',
            background: type === 'success' ? '#4caf50' : '#e31837',
            color: 'white',
            padding: '15px 25px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: '10000',
            boxShadow: '0 5px 20px rgba(0,0,0,0.2)',
            animation: 'slideIn 0.3s ease'
        });

        document.body.appendChild(notification);

        // Add animation keyframes
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Make showNotification available globally
    window.showNotification = showNotification;

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // Add to cart functionality
    function addToCart(productName, price) {
        cartCount++;
        if (cartCountEl) {
            cartCountEl.textContent = cartCount;
        }
        showNotification(`${productName} adicionado ao carrinho!`);
    }

    window.addToCart = addToCart;

    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navList = document.querySelector('.nav-list');

    if (mobileMenuBtn && navList) {
        mobileMenuBtn.addEventListener('click', function() {
            navList.classList.toggle('active');
            this.classList.toggle('active');
        });
    }

    // Scroll effects
    let lastScrollTop = 0;
    const header = document.querySelector('.header');

    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Add shadow to header on scroll
        if (scrollTop > 50) {
            header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.1)';
        } else {
            header.style.boxShadow = 'none';
        }

        lastScrollTop = scrollTop;
    });

    // Lazy loading for images
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));

    console.log('TK Fortini Games loaded successfully!');
});
