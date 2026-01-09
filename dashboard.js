document.addEventListener('DOMContentLoaded', () => {
    console.log('AI-LUMINA Dashboard initializing...');

    const getElem = (id) => document.getElementById(id);

    // Get user info from localStorage
    const savedName = localStorage.getItem('ailumina_user_name') || 'Guest';
    const savedEmail = localStorage.getItem('ailumina_user_email') || 'guest@ailumina.com';

    // Update welcome message and tooltip
    const displayNameElem = getElem('display-name');
    const tooltipNameElem = getElem('tooltip-name');
    const tooltipEmailElem = getElem('tooltip-email');

    if (displayNameElem) displayNameElem.textContent = savedName;
    if (tooltipNameElem) tooltipNameElem.textContent = savedName;
    if (tooltipEmailElem) tooltipEmailElem.textContent = savedEmail;

    // Logout functionality
    const logoutBtn = getElem('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            console.log('Logging out...');
            // Optional: Clear localStorage on logout if desired
            // localStorage.removeItem('ailumina_user_name');
            // localStorage.removeItem('ailumina_user_email');
            window.location.href = 'index.html';
        });
    }

    // Theme logic
    const themeToggle = getElem('theme-toggle');
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('ailumina_theme', theme);

        // Update icon
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                if (theme === 'light') {
                    icon.setAttribute('data-lucide', 'sun');
                } else {
                    icon.setAttribute('data-lucide', 'moon');
                }
                if (window.lucide) {
                    window.lucide.createIcons();
                }
            }
        }
    };

    const initialTheme = localStorage.getItem('ailumina_theme') || 'dark';
    applyTheme(initialTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(nextTheme);
        });
    }

    // Navigation Active State Toggle & View Switching
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = {
        'dashboard': getElem('main-dashboard'),
        'debugger': getElem('debugger-section'),
        'simplifier': getElem('simplifier-section'),
        'checker': getElem('checker-section')
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const feature = link.getAttribute('data-feature');
            console.log('Switching to feature:', feature);

            // Update nav state
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Switch sections
            Object.keys(sections).forEach(key => {
                if (sections[key]) {
                    sections[key].style.display = (key === feature) ? 'block' : 'none';
                }
            });

            // Update welcome header visibility
            const welcomeSection = document.querySelector('.welcome-section');
            if (welcomeSection) {
                welcomeSection.style.display = (feature === 'dashboard') ? 'block' : 'none';
            }
        });
    });

    // Feature Card Click (Simulation)
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('click', () => {
            const feature = card.getAttribute('data-feature');
            const targetLink = document.querySelector(`.nav-link[data-feature="${feature}"]`);
            if (targetLink) {
                targetLink.click();
            } else {
                console.log(`Launching ${feature}... (View not implemented)`);
            }
        });
    });

    console.log('AI-LUMINA Dashboard ready.');
});
