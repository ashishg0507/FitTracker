// Form validation and submission
document.getElementById('signinForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Basic validation
    if (!username || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    // Username validation (minimum 3 characters)
    if (username.length < 3) {
        showNotification('Username must be at least 3 characters long', 'error');
        return;
    }
    
    // Password validation (minimum 6 characters)
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters long', 'error');
        return;
    }
    
    try {
        const res = await fetch('/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, rememberMe })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
            showNotification(data.message || 'Invalid credentials', 'error');
            return;
        }
        // Persist remember me preference
        localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');
        if (rememberMe) {
            localStorage.setItem('rememberedUsername', username);
        } else {
            localStorage.removeItem('rememberedUsername');
        }
        showNotification('Welcome back! Sign in successful!', 'success');
        setTimeout(() => {
            window.location.href = data.redirect || '/';
        }, 800);
    } catch (err) {
        showNotification('Network error. Please try again.', 'error');
    }
});

// Load remembered username if available
document.addEventListener('DOMContentLoaded', function() {
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    const rememberMe = localStorage.getItem('rememberMe');
    
    if (rememberedUsername && rememberMe === 'true') {
        document.getElementById('username').value = rememberedUsername;
        document.getElementById('rememberMe').checked = true;
    }
});

// Notification system
function showNotification(message, type) {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        font-weight: 500;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add CSS for notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);

// Add focus effects to form inputs
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'scale(1.02)';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'scale(1)';
    });
});

// Add loading state to submit button
document.getElementById('signinForm').addEventListener('submit', function() {
    const submitBtn = document.querySelector('.signin-btn');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
    submitBtn.disabled = true;
    
    // Reset button after 3 seconds
    setTimeout(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }, 3000);
});

// Add smooth scrolling for better UX
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add enter key support for form submission
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const form = document.getElementById('signinForm');
        if (form) {
            form.dispatchEvent(new Event('submit'));
        }
    }
});

// Add demo credentials hint (remove in production)
document.addEventListener('DOMContentLoaded', function() {
    // Add a subtle hint for demo purposes
    const demoHint = document.createElement('div');
    demoHint.innerHTML = `
        <div style="
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(255, 107, 53, 0.1);
            border: 1px solid #ff6b35;
            border-radius: 8px;
            padding: 10px 15px;
            font-size: 12px;
            color: #ff6b35;
            font-family: 'Poppins', sans-serif;
            z-index: 1000;
            max-width: 200px;
        ">
            <strong>Demo:</strong> Use any username (3+ chars) and password (6+ chars)
        </div>
    `;
    document.body.appendChild(demoHint);
    
    // Auto remove after 10 seconds
    setTimeout(() => {
        if (demoHint.parentNode) {
            demoHint.parentNode.removeChild(demoHint);
        }
    }, 10000);
});
