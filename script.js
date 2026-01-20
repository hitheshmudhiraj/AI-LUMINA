document.addEventListener('DOMContentLoaded', () => {
    // Utility function for safe element selection
    const getElem = (id) => document.getElementById(id);

    const loginForm = getElem('login-form');
    const signupForm = getElem('signup-form');
    const showSignupBtn = getElem('show-signup');
    const showLoginBtn = getElem('show-login');
    const themeToggle = getElem('theme-toggle');

    // Theme logic
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('ailumina_theme', theme);

        // Update icon
        if (themeToggle) {
            themeToggle.innerHTML = theme === 'light' ?
                '<i data-lucide="sun"></i>' :
                '<i data-lucide="moon"></i>';

            if (window.lucide) {
                window.lucide.createIcons();
            }
        }
    };

    const savedTheme = localStorage.getItem('ailumina_theme') || 'dark';
    applyTheme(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
        });
    }

    // Switch to Signup
    if (showSignupBtn && loginForm && signupForm) {
        showSignupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.remove('active');
            setTimeout(() => {
                loginForm.style.display = 'none';
                signupForm.style.display = 'block';
                requestAnimationFrame(() => {
                    signupForm.classList.add('active');
                });
            }, 400);
            document.title = "AI-LUMINA - Sign Up";
        });
    }

    // Switch to Login
    if (showLoginBtn && loginForm && signupForm) {
        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            signupForm.classList.remove('active');
            setTimeout(() => {
                signupForm.style.display = 'none';
                loginForm.style.display = 'block';
                requestAnimationFrame(() => {
                    loginForm.classList.add('active');
                });
            }, 400);
            document.title = "AI-LUMINA - Login";
        });
    }

    // Form submission interception
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Form submission intercepted:', form.id);

            const btn = form.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = 'Processing...';
            btn.disabled = true;
            btn.style.opacity = '0.7';

            // Get user info
            let userName = 'User';
            let userEmail = '';

            try {
                if (form.id === 'login-form') {
                    userEmail = getElem('login-email').value;
                    userName = userEmail.split('@')[0] || 'User';
                } else if (form.id === 'signup-form') {
                    userName = getElem('signup-name').value;
                    userEmail = getElem('signup-email').value;
                }

                // Store in localStorage
                localStorage.setItem('ailumina_user_name', userName);
                localStorage.setItem('ailumina_user_email', userEmail);

                console.log('Login simulated successfully. Redirecting to dashboard...');

                // Redirect
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 800);
            } catch (err) {
                console.error('Error during login simulation:', err);
                btn.innerText = originalText;
                btn.disabled = false;
                btn.style.opacity = '1';
                alert('An error occurred. Please check the console.');
            }
        });
    });

    console.log('AI-LUMINA Auth scripts initialized.');
});
