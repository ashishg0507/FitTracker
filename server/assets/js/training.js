// Training Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize training page functionality
    initializeTrainingPage();
});

function initializeTrainingPage() {
    // Initialize level selection
    initializeLevelSelection();
    
    // Initialize quick assessment form
    initializeQuickAssessment();
    
    // Initialize smooth scrolling
    initializeSmoothScrolling();
    
    // Initialize animations
    initializeAnimations();
}

// Level Selection Functionality
function initializeLevelSelection() {
    const levelCards = document.querySelectorAll('.level-card');
    
    levelCards.forEach(card => {
        const button = card.querySelector('.btn-outline');
        
        button.addEventListener('click', function() {
            const level = card.dataset.level;
            selectLevel(level);
        });
        
        // Add hover effects
        card.addEventListener('mouseenter', function() {
            card.style.transform = 'translateY(-10px)';
        });
        
        card.addEventListener('mouseleave', function() {
            card.style.transform = 'translateY(0)';
        });
    });
}

function selectLevel(level) {
    // Remove active class from all cards
    document.querySelectorAll('.level-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // Add active class to selected card
    const selectedCard = document.querySelector(`[data-level="${level}"]`);
    selectedCard.classList.add('active');
    
    // Update button text
    const button = selectedCard.querySelector('.btn-outline');
    button.textContent = 'Selected ✓';
    button.style.background = '#ff6b35';
    button.style.color = 'white';
    button.style.borderColor = '#ff6b35';
    
    // Scroll to workout plans section
    document.getElementById('workout-plans').scrollIntoView({
        behavior: 'smooth'
    });
    
    // Show success message
    showNotification(`Great! You've selected the ${level} level.`, 'success');
}

// Quick Assessment Form
function initializeQuickAssessment() {
    const form = document.getElementById('quick-assessment');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            handleQuickAssessment(form);
        });
    }
}

function handleQuickAssessment(form) {
    const formData = new FormData(form);
    const assessmentData = {
        fitnessLevel: document.getElementById('fitness-level').value,
        workoutGoal: document.getElementById('workout-goal').value,
        workoutFrequency: document.getElementById('workout-frequency').value
    };
    
    // Validate form
    if (!assessmentData.fitnessLevel || !assessmentData.workoutGoal || !assessmentData.workoutFrequency) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    // Simulate processing
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Creating Your Plan...';
    submitButton.disabled = true;
    
    setTimeout(() => {
        // Generate personalized plan
        const plan = generatePersonalizedPlan(assessmentData);
        displayPersonalizedPlan(plan);
        
        // Reset form
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        form.reset();
        
        showNotification('Your personalized plan is ready!', 'success');
    }, 2000);
}

function generatePersonalizedPlan(data) {
    const plans = {
        'beginner': {
            'weight-loss': {
                name: 'Beginner Weight Loss',
                duration: '8 weeks',
                frequency: '3-4 times/week',
                duration_per_workout: '30-45 minutes',
                focus: 'Cardio and light strength training',
                description: 'A gentle introduction to fitness focused on burning calories and building basic strength.'
            },
            'muscle-gain': {
                name: 'Beginner Muscle Building',
                duration: '10 weeks',
                frequency: '3 times/week',
                duration_per_workout: '45-60 minutes',
                focus: 'Full body strength training',
                description: 'Learn proper form while building lean muscle with progressive resistance training.'
            },
            'strength': {
                name: 'Beginner Strength',
                duration: '8 weeks',
                frequency: '3 times/week',
                duration_per_workout: '45 minutes',
                focus: 'Compound movements and form',
                description: 'Master the basics of strength training with proper technique.'
            },
            'endurance': {
                name: 'Beginner Endurance',
                duration: '6 weeks',
                frequency: '4 times/week',
                duration_per_workout: '30-40 minutes',
                focus: 'Cardio and stamina building',
                description: 'Build your cardiovascular fitness and endurance gradually.'
            },
            'general-fitness': {
                name: 'Beginner Total Fitness',
                duration: '8 weeks',
                frequency: '3-4 times/week',
                duration_per_workout: '40-50 minutes',
                focus: 'Balanced fitness program',
                description: 'A well-rounded program covering strength, cardio, and flexibility.'
            }
        },
        'intermediate': {
            'weight-loss': {
                name: 'Intermediate Fat Burn',
                duration: '6 weeks',
                frequency: '4-5 times/week',
                duration_per_workout: '45-60 minutes',
                focus: 'HIIT and strength training',
                description: 'High-intensity workouts designed to maximize fat burning.'
            },
            'muscle-gain': {
                name: 'Intermediate Muscle Growth',
                duration: '12 weeks',
                frequency: '4-5 times/week',
                duration_per_workout: '60-75 minutes',
                focus: 'Progressive overload training',
                description: 'Advanced muscle building with increased volume and intensity.'
            },
            'strength': {
                name: 'Intermediate Power',
                duration: '10 weeks',
                frequency: '4 times/week',
                duration_per_workout: '60 minutes',
                focus: 'Strength and power development',
                description: 'Build serious strength with advanced training techniques.'
            },
            'endurance': {
                name: 'Intermediate Endurance',
                duration: '8 weeks',
                frequency: '5 times/week',
                duration_per_workout: '45-60 minutes',
                focus: 'Advanced cardio training',
                description: 'Push your endurance limits with challenging workouts.'
            },
            'general-fitness': {
                name: 'Intermediate Total Fitness',
                duration: '10 weeks',
                frequency: '4-5 times/week',
                duration_per_workout: '50-65 minutes',
                focus: 'Comprehensive fitness development',
                description: 'Advanced program covering all aspects of fitness.'
            }
        },
        'advanced': {
            'weight-loss': {
                name: 'Advanced Fat Shred',
                duration: '4 weeks',
                frequency: '5-6 times/week',
                duration_per_workout: '60-75 minutes',
                focus: 'Extreme HIIT and metabolic training',
                description: 'Intense program for rapid fat loss and conditioning.'
            },
            'muscle-gain': {
                name: 'Advanced Mass Builder',
                duration: '16 weeks',
                frequency: '5-6 times/week',
                duration_per_workout: '75-90 minutes',
                focus: 'Advanced hypertrophy training',
                description: 'Elite-level muscle building program for serious athletes.'
            },
            'strength': {
                name: 'Advanced Power',
                duration: '12 weeks',
                frequency: '5 times/week',
                duration_per_workout: '75 minutes',
                focus: 'Maximum strength development',
                description: 'Elite strength training for powerlifters and athletes.'
            },
            'endurance': {
                name: 'Advanced Endurance',
                duration: '10 weeks',
                frequency: '6 times/week',
                duration_per_workout: '60-90 minutes',
                focus: 'Elite endurance training',
                description: 'Professional-level endurance and stamina development.'
            },
            'general-fitness': {
                name: 'Advanced Total Fitness',
                duration: '12 weeks',
                frequency: '5-6 times/week',
                duration_per_workout: '65-80 minutes',
                focus: 'Elite comprehensive training',
                description: 'Professional-level fitness program for serious athletes.'
            }
        }
    };
    
    return plans[data.fitnessLevel][data.workoutGoal];
}

function displayPersonalizedPlan(plan) {
    // Create modal or update existing content
    const modal = createPlanModal(plan);
    document.body.appendChild(modal);
    
    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function createPlanModal(plan) {
    const modal = document.createElement('div');
    modal.className = 'plan-modal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2>Your Personalized Plan</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="plan-details">
                    <h3>${plan.name}</h3>
                    <p class="plan-description">${plan.description}</p>
                    
                    <div class="plan-specs">
                        <div class="spec">
                            <i class="fas fa-calendar"></i>
                            <span><strong>Duration:</strong> ${plan.duration}</span>
                        </div>
                        <div class="spec">
                            <i class="fas fa-clock"></i>
                            <span><strong>Frequency:</strong> ${plan.frequency}</span>
                        </div>
                        <div class="spec">
                            <i class="fas fa-stopwatch"></i>
                            <span><strong>Workout Length:</strong> ${plan.duration_per_workout}</span>
                        </div>
                        <div class="spec">
                            <i class="fas fa-target"></i>
                            <span><strong>Focus:</strong> ${plan.focus}</span>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn btn-primary" onclick="startPlan('${plan.name}')">Start This Plan</button>
                        <button class="btn btn-secondary close-modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal styles
    const style = document.createElement('style');
    style.textContent = `
        .plan-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }
        
        .modal-content {
            background: white;
            border-radius: 20px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            animation: modalSlideIn 0.3s ease-out;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 2rem 2rem 1rem;
            border-bottom: 1px solid #e9ecef;
        }
        
        .modal-header h2 {
            color: #333;
            margin: 0;
        }
        
        .close-modal {
            background: none;
            border: none;
            font-size: 2rem;
            color: #666;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .modal-body {
            padding: 2rem;
        }
        
        .plan-details h3 {
            color: #ff6b35;
            font-size: 1.8rem;
            margin-bottom: 1rem;
        }
        
        .plan-description {
            color: #666;
            margin-bottom: 2rem;
            line-height: 1.6;
        }
        
        .plan-specs {
            display: grid;
            gap: 1rem;
            margin-bottom: 2rem;
        }
        
        .spec {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 10px;
        }
        
        .spec i {
            color: #ff6b35;
            width: 20px;
        }
        
        .modal-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
        }
        
        @keyframes modalSlideIn {
            from {
                opacity: 0;
                transform: translateY(-50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    
    document.head.appendChild(style);
    
    // Add event listeners
    modal.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = '';
        });
    });
    
    modal.querySelector('.modal-overlay').addEventListener('click', () => {
        modal.remove();
        document.body.style.overflow = '';
    });
    
    return modal;
}

// Smooth Scrolling
function initializeSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Animations
function initializeAnimations() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll('.level-card, .plan-card, .tip-card');
    animateElements.forEach(el => {
        observer.observe(el);
    });
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add notification styles
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 2rem;
            border-radius: 10px;
            color: white;
            font-weight: 500;
            z-index: 10001;
            animation: slideInRight 0.3s ease-out;
        }
        
        .notification-success {
            background: #28a745;
        }
        
        .notification-error {
            background: #dc3545;
        }
        
        .notification-info {
            background: #17a2b8;
        }
        
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
    `;
    
    if (!document.querySelector('style[data-notification]')) {
        style.setAttribute('data-notification', 'true');
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Plan Actions
function startPlan(planName) {
    showNotification(`Starting ${planName}! Redirecting to workout dashboard...`, 'success');
    
    // Simulate redirect after a delay
    setTimeout(() => {
        // In a real application, this would redirect to the workout dashboard
        console.log(`Starting plan: ${planName}`);
        // window.location.href = '/dashboard';
    }, 2000);
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add CSS for animations
const animationCSS = `
    .level-card,
    .plan-card,
    .tip-card {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.6s ease-out;
    }
    
    .level-card.animate-in,
    .plan-card.animate-in,
    .tip-card.animate-in {
        opacity: 1;
        transform: translateY(0);
    }
    
    .level-card.active {
        border: 2px solid #ff6b35;
        transform: translateY(-10px);
    }
`;

// Inject animation CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = animationCSS;
document.head.appendChild(styleSheet);
