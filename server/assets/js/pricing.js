// Global variables
let selectedPlan = null;
let isYearly = false;
let selectedPaymentMethod = 'googlepay';

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializePricing();
    initializeAnimations();
    initializePaymentToggle();
    initializePaymentForm();
});

// Initialize pricing functionality
function initializePricing() {
    const billingToggle = document.getElementById('billingToggle');
    const amounts = document.querySelectorAll('.amount');
    
    billingToggle.addEventListener('change', function() {
        isYearly = this.checked;
        updatePricing();
    });
}

// Update pricing based on billing cycle
function updatePricing() {
    const amounts = document.querySelectorAll('.amount');
    
    amounts.forEach(amount => {
        const monthlyPrice = amount.getAttribute('data-monthly');
        const yearlyPrice = amount.getAttribute('data-yearly');
        
        if (isYearly) {
            amount.textContent = yearlyPrice;
            // Add strikethrough effect for monthly price
            if (!amount.parentElement.querySelector('.original-price')) {
                const originalPrice = document.createElement('span');
                originalPrice.className = 'original-price';
                originalPrice.style.textDecoration = 'line-through';
                originalPrice.style.color = '#666';
                originalPrice.style.fontSize = '0.8em';
                originalPrice.style.marginRight = '10px';
                originalPrice.textContent = `₹${monthlyPrice}`;
                amount.parentElement.insertBefore(originalPrice, amount);
            }
        } else {
            amount.textContent = monthlyPrice;
            // Remove strikethrough effect
            const originalPrice = amount.parentElement.querySelector('.original-price');
            if (originalPrice) {
                originalPrice.remove();
            }
        }
    });
}

// Initialize animations
function initializeAnimations() {
    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.pricing-card');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Floating icons animation
    const floatingIcons = document.querySelectorAll('.floating-icon');
    floatingIcons.forEach((icon, index) => {
        icon.style.animationDelay = `${index * 0.5}s`;
    });
}

// Initialize payment toggle
function initializePaymentToggle() {
    const billingToggle = document.getElementById('billingToggle');
    
    // Add smooth transition effect
    billingToggle.addEventListener('change', function() {
        const cards = document.querySelectorAll('.pricing-card');
        cards.forEach(card => {
            card.style.transition = 'all 0.3s ease';
        });
    });
}

// Scroll to pricing section
function scrollToPricing() {
    const pricingSection = document.getElementById('pricing');
    pricingSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

// Select plan function
function selectPlan(planType) {
    selectedPlan = planType;
    const planData = {
        'basic': {
            name: 'Basic Plan',
            description: 'Perfect for beginners',
            monthlyPrice: 299,
            yearlyPrice: 239
        },
        'pro': {
            name: 'Pro Plan',
            description: 'For serious fitness enthusiasts',
            monthlyPrice: 599,
            yearlyPrice: 479
        },
        'premium': {
            name: 'Premium Plan',
            description: 'Complete fitness solution',
            monthlyPrice: 999,
            yearlyPrice: 799
        }
    };
    
    const plan = planData[planType];
    const currentPrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
    
    // Update modal content
    document.getElementById('selectedPlanName').textContent = plan.name;
    document.getElementById('selectedPlanDescription').textContent = plan.description;
    document.getElementById('selectedPlanPrice').textContent = currentPrice;
    document.getElementById('summaryPlan').textContent = plan.name;
    document.getElementById('summaryBilling').textContent = isYearly ? 'Yearly' : 'Monthly';
    document.getElementById('summaryTotal').textContent = `₹${currentPrice}`;
    
    // Update pay button
    const payButton = document.getElementById('payButton');
    payButton.querySelector('span').textContent = `Pay ₹${currentPrice}`;
    
    // Update billing info
    const billingCycle = document.querySelector('.billing-cycle');
    const savingsText = document.getElementById('savingsText');
    
    if (isYearly) {
        billingCycle.textContent = 'Yearly billing';
        savingsText.style.display = 'block';
    } else {
        billingCycle.textContent = 'Monthly billing';
        savingsText.style.display = 'none';
    }
    
    // Show modal with animation
    const modal = document.getElementById('paymentModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Add entrance animation
    setTimeout(() => {
        modal.querySelector('.modal-content').style.transform = 'scale(1)';
    }, 10);
}

// Close modal
function closeModal() {
    const modal = document.getElementById('paymentModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Select payment method
function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    
    // Remove active class from all buttons
    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to selected button
    document.getElementById(method + '-btn').classList.add('active');
    
    // Show/hide relevant forms
    const cardForm = document.getElementById('cardForm');
    const upiForm = document.getElementById('upiForm');
    
    if (method === 'card') {
        cardForm.style.display = 'block';
        upiForm.style.display = 'none';
    } else if (method === 'upi') {
        cardForm.style.display = 'none';
        upiForm.style.display = 'block';
    } else {
        cardForm.style.display = 'none';
        upiForm.style.display = 'none';
    }
}

// Process payment
function processPayment() {
    const payButton = document.getElementById('payButton');
    const loading = document.getElementById('paymentLoading');
    const buttonText = payButton.querySelector('span');
    
    // Show loading state
    payButton.disabled = true;
    loading.style.display = 'block';
    buttonText.textContent = 'Processing...';
    
    // Simulate payment processing based on method
    let processingTime = 2000;
    
    if (selectedPaymentMethod === 'card') {
        processingTime = 3000; // Card payments take longer
    } else if (selectedPaymentMethod === 'upi') {
        processingTime = 1500; // UPI is faster
    }
    
    setTimeout(() => {
        showPaymentSuccess();
    }, processingTime);
}

// Initiate UPI payment
function initiateUPI(provider) {
    const upiButtons = document.querySelectorAll('.upi-btn');
    upiButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Simulate UPI app opening
    showNotification(`Opening ${provider}...`, 'info');
    
    setTimeout(() => {
        processPayment();
    }, 1000);
}

// Validate card form
function validateCardForm() {
    const cardNumber = document.getElementById('cardNumber').value;
    const expiryDate = document.getElementById('expiryDate').value;
    const cvv = document.getElementById('cvv').value;
    const cardholderName = document.getElementById('cardholderName').value;
    
    if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
        showNotification('Please fill in all card details', 'error');
        return false;
    }
    
    if (cardNumber.length < 16) {
        showNotification('Please enter a valid card number', 'error');
        return false;
    }
    
    if (cvv.length < 3) {
        showNotification('Please enter a valid CVV', 'error');
        return false;
    }
    
    return true;
}

// Show payment success
function showPaymentSuccess() {
    const modal = document.getElementById('paymentModal');
    const modalContent = modal.querySelector('.modal-content');
    
    modalContent.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <svg class="success-checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle class="success-checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path class="checkmark" fill="none" d="m14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
            <h2 style="color: #ff6b35; margin: 20px 0;">Payment Successful!</h2>
            <p style="color: #cccccc; margin-bottom: 30px;">Welcome to Fit Track! Your subscription is now active.</p>
            <button class="btn-primary" onclick="closeModal()" style="margin-right: 10px;">
                <i class="fas fa-check"></i>
                Get Started
            </button>
            <button class="btn-secondary" onclick="closeModal()">
                <i class="fas fa-download"></i>
                Download App
            </button>
        </div>
    `;
    
    // Add success animation
    setTimeout(() => {
        const checkmark = modalContent.querySelector('.success-checkmark');
        if (checkmark) {
            checkmark.style.animation = 'scale 0.3s ease-in-out 0.9s both';
        }
    }, 100);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('paymentModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Add smooth scrolling for navigation links
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

// Add parallax effect to hero section
window.addEventListener('scroll', function() {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    const heroAnimation = document.querySelector('.hero-animation');
    
    if (hero && heroAnimation) {
        const rate = scrolled * -0.5;
        heroAnimation.style.transform = `translateY(${rate}px)`;
    }
});

// Add typing effect to hero title
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Initialize typing effect when page loads
window.addEventListener('load', function() {
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const originalText = heroTitle.innerHTML;
        typeWriter(heroTitle, originalText, 50);
    }
});

// Add hover effects to pricing cards
document.querySelectorAll('.pricing-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-15px) scale(1.02)';
        this.style.boxShadow = '0 25px 50px rgba(255, 107, 53, 0.3)';
    });
    
    card.addEventListener('mouseleave', function() {
        if (!this.classList.contains('featured')) {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.boxShadow = 'none';
        } else {
            this.style.transform = 'scale(1.05)';
        }
    });
});

// Add pulse animation to CTA buttons
document.querySelectorAll('.btn-primary, .btn-card').forEach(button => {
    button.addEventListener('mouseenter', function() {
        this.style.animation = 'pulse 0.6s ease-in-out';
    });
    
    button.addEventListener('animationend', function() {
        this.style.animation = '';
    });
});

// Add counter animation for pricing
function animateCounter(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);
        element.textContent = current;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Initialize counter animation when pricing section comes into view
const pricingObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const amounts = entry.target.querySelectorAll('.amount');
            amounts.forEach(amount => {
                const finalValue = parseInt(amount.textContent);
                animateCounter(amount, 0, finalValue, 1000);
            });
            pricingObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const pricingSection = document.getElementById('pricing');
if (pricingSection) {
    pricingObserver.observe(pricingSection);
}

// Add keyboard navigation support
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Add form validation for payment
function validatePayment() {
    // This would integrate with actual payment validation
    return true;
}

// Add loading states for better UX
function showLoading(element) {
    element.innerHTML = '<div class="loading"></div> Loading...';
    element.disabled = true;
}

function hideLoading(element, originalText) {
    element.innerHTML = originalText;
    element.disabled = false;
}

// Add success notifications
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#ff6b35' : '#ff4444'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 3000;
        animation: slideInRight 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Initialize payment form
function initializePaymentForm() {
    // Card number formatting
    const cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            if (formattedValue.length <= 19) {
                e.target.value = formattedValue;
            }
        });
    }
    
    // Expiry date formatting
    const expiryInput = document.getElementById('expiryDate');
    if (expiryInput) {
        expiryInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });
    }
    
    // CVV formatting
    const cvvInput = document.getElementById('cvv');
    if (cvvInput) {
        cvvInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }
    
    // Cardholder name formatting
    const nameInput = document.getElementById('cardholderName');
    if (nameInput) {
        nameInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
        });
    }
}

// Add CSS for notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        z-index: 3000;
        animation: slideInRight 0.3s ease-out;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    }
    
    .notification.success {
        background: #4CAF50;
    }
    
    .notification.error {
        background: #f44336;
    }
    
    .notification.info {
        background: #2196F3;
    }
`;
document.head.appendChild(style);
