// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
}));

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(0, 0, 0, 0.95)';
        navbar.style.backdropFilter = 'blur(10px)';
    } else {
        navbar.style.background = '#000';
        navbar.style.backdropFilter = 'none';
    }
});

// Smooth scrolling for anchor links
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

// Intersection Observer for animations
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
document.addEventListener('DOMContentLoaded', () => {
    // Feature cards animation
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });

    // Gallery items animation with staggered effect
    const galleryItems = document.querySelectorAll('.gallery-item');
    galleryItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(50px) scale(0.9)';
        item.style.transition = `opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${index * 0.2}s, transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${index * 0.2}s`;
        observer.observe(item);
    });

    // Add special animation for featured item
    const featuredItem = document.querySelector('.gallery-item-wide');
    if (featuredItem) {
        featuredItem.addEventListener('mouseenter', () => {
            featuredItem.style.animation = 'bounceIn 0.6s ease-out';
        });
    }

    // Testimonial cards animation
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    testimonialCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateX(-30px)';
        card.style.transition = `opacity 0.6s ease ${index * 0.2}s, transform 0.6s ease ${index * 0.2}s`;
        observer.observe(card);
    });

    // About section animation
    const aboutText = document.querySelector('.about-text');
    const aboutImage = document.querySelector('.about-image');
    
    if (aboutText) {
        aboutText.style.opacity = '0';
        aboutText.style.transform = 'translateX(-50px)';
        aboutText.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        observer.observe(aboutText);
    }
    
    if (aboutImage) {
        aboutImage.style.opacity = '0';
        aboutImage.style.transform = 'translateX(50px)';
        aboutImage.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        observer.observe(aboutImage);
    }
});

// Button click animations
document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function(e) {
        // Create ripple effect
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
});

// Add ripple effect styles
const style = document.createElement('style');
style.textContent = `
    .btn {
        position: relative;
        overflow: hidden;
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Parallax effect for hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero-image');
    const rate = scrolled * -0.5;
    
    if (hero) {
        hero.style.transform = `translateY(${rate}px)`;
    }
});

// Typing animation for hero title
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

// Initialize typing animation when page loads
window.addEventListener('load', () => {
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const originalText = heroTitle.textContent;
        typeWriter(heroTitle, originalText, 50);
    }
});

// Counter animation for stats
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    
    function updateCounter() {
        start += increment;
        if (start < target) {
            element.textContent = Math.floor(start) + (target >= 1000 ? 'K+' : '+');
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target + (target >= 1000 ? 'K+' : '+');
        }
    }
    
    updateCounter();
}

// Animate counters when they come into view
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumbers = entry.target.querySelectorAll('.stat h3');
            statNumbers.forEach(stat => {
                const text = stat.textContent;
                const number = parseInt(text.replace(/[^\d]/g, ''));
                if (number) {
                    animateCounter(stat, number);
                }
            });
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

document.addEventListener('DOMContentLoaded', () => {
    const heroStats = document.querySelector('.hero-stats');
    if (heroStats) {
        statsObserver.observe(heroStats);
    }
});

// Add loading animation
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

// Add loading styles
const loadingStyle = document.createElement('style');
loadingStyle.textContent = `
    body {
        opacity: 0;
        transition: opacity 0.5s ease;
    }
    
    body.loaded {
        opacity: 1;
    }
    
    /* Floating animation for hero stats */
    .stat {
        animation: float 3s ease-in-out infinite;
    }
    
    .stat:nth-child(2) {
        animation-delay: 1s;
    }
    
    .stat:nth-child(3) {
        animation-delay: 2s;
    }
    
    /* Pulse animation for feature icons */
    .feature-icon {
        animation: pulse 2s ease-in-out infinite;
    }
    
    .feature-icon:nth-child(2) {
        animation-delay: 0.5s;
    }
    
    .feature-icon:nth-child(3) {
        animation-delay: 1s;
    }
`;
document.head.appendChild(loadingStyle);

// Add scroll-triggered animations
const scrollAnimations = () => {
    const elements = document.querySelectorAll('.section-title, .about-text, .about-image, .gallery-item, .testimonial-card, .feature-card');
    
    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < window.innerHeight - elementVisible) {
            element.classList.add('animate');
        }
    });
};

window.addEventListener('scroll', scrollAnimations);

// Hero Image Carousel
let currentSlide = 0;
const slides = document.querySelectorAll('.hero-bg-image');
const indicators = document.querySelectorAll('.indicator');
const totalSlides = slides.length;

function showSlide(index) {
    // Remove active class from all slides and indicators
    slides.forEach(slide => slide.classList.remove('active'));
    indicators.forEach(indicator => indicator.classList.remove('active'));
    
    // Add active class to current slide and indicator
    slides[index].classList.add('active');
    indicators[index].classList.add('active');
}

function nextSlide() {
    currentSlide = (currentSlide + 1) % totalSlides;
    showSlide(currentSlide);
}

function goToSlide(index) {
    currentSlide = index;
    showSlide(currentSlide);
}

// Auto-advance carousel every 5 seconds
setInterval(nextSlide, 5000);

// Add click event listeners to indicators
indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => goToSlide(index));
});

// Add mouse movement parallax effect
document.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX / window.innerWidth;
    const mouseY = e.clientY / window.innerHeight;
    
    const activeSlide = document.querySelector('.hero-bg-image.active');
    if (activeSlide) {
        const moveX = (mouseX - 0.5) * 20;
        const moveY = (mouseY - 0.5) * 20;
        activeSlide.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.1)`;
    }
});

// Add intersection observer for section titles
const titleObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeInUp 1s ease-out';
        }
    });
}, { threshold: 0.5 });

document.addEventListener('DOMContentLoaded', () => {
    const sectionTitles = document.querySelectorAll('.section-title');
    sectionTitles.forEach(title => {
        titleObserver.observe(title);
    });

    // Add interactive hover effects for gallery items
    const galleryItems = document.querySelectorAll('.gallery-item');
    galleryItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            // Add shimmer effect
            item.style.background = 'linear-gradient(90deg, transparent, rgba(255, 107, 53, 0.1), transparent)';
            item.style.backgroundSize = '200% 100%';
            item.style.animation = 'shimmer 1.5s ease-in-out';
        });

        item.addEventListener('mouseleave', () => {
            item.style.background = 'white';
            item.style.animation = 'none';
        });

        // Add click animation
        item.addEventListener('click', () => {
            item.style.transform = 'scale(0.95)';
            setTimeout(() => {
                item.style.transform = '';
            }, 150);
        });
    });

    // Add typing animation for section subtitle
    const typingText = document.querySelector('.typing-text');
    if (typingText) {
        const text = typingText.textContent;
        typingText.textContent = '';
        let i = 0;
        const typeWriter = () => {
            if (i < text.length) {
                typingText.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            }
        };
        setTimeout(typeWriter, 1000);
    }

    // Add progress ring animations on scroll
    const progressRings = document.querySelectorAll('.progress-ring-circle');
    const progressObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const circle = entry.target;
                const percentage = circle.closest('.gallery-item').dataset.category;
                let offset = 157; // Full circle
                
                switch(percentage) {
                    case 'strength':
                        offset = 23.55; // 85%
                        break;
                    case 'cardio':
                        offset = 12.56; // 92%
                        break;
                    case 'yoga':
                        offset = 34.54; // 78%
                        break;
                    case 'hiit':
                        offset = 7.85; // 95%
                        break;
                }
                
                setTimeout(() => {
                    circle.style.strokeDashoffset = offset;
                }, 500);
                progressObserver.unobserve(circle);
            }
        });
    }, { threshold: 0.5 });

    progressRings.forEach(ring => {
        progressObserver.observe(ring);
    });

    // Reveal program rows on scroll
    const programRows = document.querySelectorAll('.program-row');
    const rowObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                rowObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    programRows.forEach(row => rowObserver.observe(row));

    // Impact & Goals counters and rings
    const impactCards = document.querySelectorAll('.impact-card');
    const ringObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const card = entry.target;
                const target = parseInt(card.dataset.target || '0', 10);
                const ring = card.querySelector('.ring-fg');
                const value = card.querySelector('.ring-value');
                const circumference = 2 * Math.PI * 60; // r=60
                let current = 0;
                const isPercent = value && value.textContent.includes('%');
                const isHours = value && value.textContent.includes('h');

                const step = Math.max(1, Math.round(target / 60));
                const interval = setInterval(() => {
                    current += step;
                    if (current >= target) current = target;
                    const offset = circumference - (current / (target || 1)) * circumference;
                    if (ring && isFinite(offset)) ring.style.strokeDashoffset = isNaN(offset) ? circumference : offset;
                    if (value) {
                        value.textContent = isPercent ? `${current}%` : isHours ? `${current}h` : `${current}`;
                    }
                    if (current >= target) clearInterval(interval);
                }, 20);

                ringObserver.unobserve(card);
            }
        });
    }, { threshold: 0.4 });

    impactCards.forEach(card => ringObserver.observe(card));
});
