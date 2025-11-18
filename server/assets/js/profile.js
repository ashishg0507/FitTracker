// Profile Page JavaScript Functionality

// Global variables
let currentUser = {
	firstName: '',
	lastName: '',
	email: '',
	phone: '',
	dateOfBirth: '',
	gender: '',
	bio: '',
	height: 0,
	currentWeight: 0,
	targetWeight: 0,
	bodyFat: 0,
	goals: [],
	activityLevel: '',
	workoutDuration: 0,
	workoutFrequency: 0,
	preferredTime: '',
	cardio: [],
	strength: [],
	flexibility: [],
	notifications: {
		workoutReminders: false,
		goalProgress: false,
		motivational: false,
		socialUpdates: false
	},
	username: ''
};

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeProfile();
    setupEventListeners();
    loadUserData();
});

// API helpers
async function apiGetProfile() {
    const res = await fetch('/api/profile', { headers: { 'Accept': 'application/json' } });
    if (!res.ok) {
        const message = await safeReadJsonMessage(res);
        const err = new Error(message || 'Failed to load profile');
        err.status = res.status;
        throw err;
    }
    const data = await res.json();
    return data.user;
}

async function apiUpdateProfile(payload) {
    const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const message = await safeReadJsonMessage(res);
        const err = new Error(message || 'Failed to update profile');
        err.status = res.status;
        throw err;
    }
    const data = await res.json();
    return data.user;
}

async function safeReadJsonMessage(res) {
    try {
        const data = await res.json();
        return data && (data.message || data.error);
    } catch (_) {
        return null;
    }
}

// Initialize Profile
function initializeProfile() {
    // Set up tab functionality
    setupTabs();
    
    // Set up avatar upload
    setupAvatarUpload();
    
    // Set up form handlers
    setupFormHandlers();
    
    // Set up profile actions
    setupProfileActions();
    
    // Initialize animations
    initializeAnimations();
}

// Setup Tabs
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // Add animation
            const activeContent = document.getElementById(targetTab);
            activeContent.style.animation = 'fadeIn 0.3s ease';
            
            // Load diet plan if diet tab is clicked
            if (targetTab === 'diet') {
                loadDietPlan();
            }
        });
    });
}

// Setup Avatar Upload
function setupAvatarUpload() {
    const avatarContainer = document.querySelector('.avatar-container');
    const avatarUpload = document.getElementById('avatarUpload');
    const avatarImage = document.getElementById('avatarImage');
    
    avatarContainer.addEventListener('click', () => {
        avatarUpload.click();
    });
    
    avatarUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                avatarImage.src = e.target.result;
                showMessage('Profile picture updated successfully!', 'success');
            };
            reader.readAsDataURL(file);
        }
    });
}

// Setup Form Handlers
function setupFormHandlers() {
    // Personal Information Form
    const personalForm = document.getElementById('personalForm');
    personalForm.addEventListener('submit', handlePersonalFormSubmit);
    
    // Fitness Goals Form
    const fitnessForm = document.getElementById('fitnessForm');
    fitnessForm.addEventListener('submit', handleFitnessFormSubmit);
    
    // Preferences Form
    const preferencesForm = document.getElementById('preferencesForm');
    preferencesForm.addEventListener('submit', handlePreferencesFormSubmit);
    
    // Cancel buttons
    document.getElementById('cancelPersonal').addEventListener('click', () => {
        loadPersonalData();
        showMessage('Changes cancelled', 'info');
    });
    
    document.getElementById('cancelFitness').addEventListener('click', () => {
        loadFitnessData();
        showMessage('Changes cancelled', 'info');
    });
    
    document.getElementById('cancelPreferences').addEventListener('click', () => {
        loadPreferencesData();
        showMessage('Changes cancelled', 'info');
    });
}

// Setup Profile Actions
function setupProfileActions() {
    // Edit Profile Button
    document.getElementById('editProfileBtn').addEventListener('click', () => {
        const personalTab = document.querySelector('[data-tab="personal"]');
        personalTab.click();
    });
    
    // Share Profile Button
    document.getElementById('shareProfileBtn').addEventListener('click', () => {
        shareProfile();
    });
}

// Handle Personal Form Submit
function handlePersonalFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const personalData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        dateOfBirth: formData.get('dateOfBirth'),
        gender: formData.get('gender'),
        bio: formData.get('bio')
    };
    
    apiUpdateProfile(personalData)
        .then((user) => {
            Object.assign(currentUser, user);
            updateProfileDisplay();
            showMessage('Personal information updated successfully!', 'success');
        })
        .catch((err) => {
            showMessage(err?.message || 'Failed to update profile', 'error');
        });
}

// Handle Fitness Form Submit
function handleFitnessFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const fitnessData = {
        height: parseInt(formData.get('height')),
        currentWeight: parseFloat(formData.get('currentWeight')),
        targetWeight: parseFloat(formData.get('targetWeight')),
        bodyFat: parseFloat(formData.get('bodyFat')),
        goals: formData.getAll('goals'),
        activityLevel: formData.get('activityLevel')
    };
    
    apiUpdateProfile(fitnessData)
        .then((user) => {
            Object.assign(currentUser, user);
            updateProfileDisplay();
            showMessage('Fitness goals updated successfully!', 'success');
        })
        .catch((err) => {
            showMessage(err?.message || 'Failed to update fitness goals', 'error');
        });
}

// Handle Preferences Form Submit
function handlePreferencesFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    const preferencesData = {
        dietaryPreferences: {
            dietaryType: formData.get('dietaryType') || 'vegetarian'
        },
        workoutDuration: parseInt(formData.get('workoutDuration')),
        workoutFrequency: parseInt(formData.get('workoutFrequency')),
        preferredTime: formData.get('preferredTime'),
        cardio: formData.getAll('cardio'),
        strength: formData.getAll('strength'),
        flexibility: formData.getAll('flexibility'),
        notifications: {
            workoutReminders: formData.has('workoutReminders'),
            goalProgress: formData.has('goalProgress'),
            motivational: formData.has('motivational'),
            socialUpdates: formData.has('socialUpdates')
        }
    };
    
    apiUpdateProfile(preferencesData)
        .then((user) => {
            Object.assign(currentUser, user);
            showMessage('Preferences updated successfully!', 'success');
        })
        .catch((err) => {
            showMessage(err?.message || 'Failed to update preferences', 'error');
        });
}

// Load User Data
async function loadUserData() {
    try {
        const user = await apiGetProfile();
        currentUser = { ...currentUser, ...user };
        updateProfileDisplay();
        loadPersonalData();
        loadFitnessData();
        loadPreferencesData();
    } catch (err) {
        if (err && err.status === 401) {
            window.location.href = '/signin';
            return;
        }
        showMessage(err?.message || 'Failed to load profile data', 'error');
    }
}

// Update Profile Display
function updateProfileDisplay() {
    // Update profile header
    const name = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username || '';
    document.getElementById('profileName').textContent = name || 'Your Name';
    
    // Update quick stats
    document.getElementById('currentWeight').textContent = `${currentUser.currentWeight} kg`;
    document.getElementById('targetWeight').textContent = `${currentUser.targetWeight} kg`;
    document.getElementById('height').textContent = `${currentUser.height} cm`;
    
    // Calculate age
    const age = calculateAge(currentUser.dateOfBirth);
    document.getElementById('age').textContent = age;
    
    // Update goal progress
    const goalProgress = calculateGoalProgress();
    document.getElementById('goalProgress').textContent = `${goalProgress}%`;
}

// Load Personal Data
function loadPersonalData() {
    const form = document.getElementById('personalForm');
    form.firstName.value = currentUser.firstName;
    form.lastName.value = currentUser.lastName;
    form.email.value = currentUser.email;
    form.phone.value = currentUser.phone;
    form.dateOfBirth.value = currentUser.dateOfBirth;
    form.gender.value = currentUser.gender;
    form.bio.value = currentUser.bio;
}

// Load Fitness Data
function loadFitnessData() {
    const form = document.getElementById('fitnessForm');
    form.height.value = currentUser.height;
    form.currentWeight.value = currentUser.currentWeight;
    form.targetWeight.value = currentUser.targetWeight;
    form.bodyFat.value = currentUser.bodyFat;
    
    // Clear all goal checkboxes
    form.querySelectorAll('input[name="goals"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Check selected goals
    currentUser.goals.forEach(goal => {
        const checkbox = form.querySelector(`input[value="${goal}"]`);
        if (checkbox) checkbox.checked = true;
    });
    
    // Set activity level
    const activityRadio = form.querySelector(`input[value="${currentUser.activityLevel}"]`);
    if (activityRadio) activityRadio.checked = true;
}

// Load Preferences Data
function loadPreferencesData() {
    // Load dietary preferences if they exist
    if (currentUser.dietaryPreferences) {
        const dietaryPrefs = currentUser.dietaryPreferences;
        
        // Set dietary type
        const dietaryTypeSelect = document.getElementById('dietaryType');
        if (dietaryTypeSelect) {
            dietaryTypeSelect.value = dietaryPrefs.dietaryType || 'vegetarian';
        }
    }
    
    // Load workout preferences
    const form = document.getElementById('preferencesForm');
    form.workoutDuration.value = currentUser.workoutDuration;
    form.workoutFrequency.value = currentUser.workoutFrequency;
    form.preferredTime.value = currentUser.preferredTime;
    
    // Clear all exercise preferences
    form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Set cardio preferences
    currentUser.cardio.forEach(pref => {
        const checkbox = form.querySelector(`input[name="cardio"][value="${pref}"]`);
        if (checkbox) checkbox.checked = true;
    });
    
    // Set strength preferences
    currentUser.strength.forEach(pref => {
        const checkbox = form.querySelector(`input[name="strength"][value="${pref}"]`);
        if (checkbox) checkbox.checked = true;
    });
    
    // Set flexibility preferences
    currentUser.flexibility.forEach(pref => {
        const checkbox = form.querySelector(`input[name="flexibility"][value="${pref}"]`);
        if (checkbox) checkbox.checked = true;
    });
    
    // Set notification preferences
    Object.keys(currentUser.notifications).forEach(key => {
        const checkbox = form.querySelector(`input[name="${key}"]`);
        if (checkbox) checkbox.checked = currentUser.notifications[key];
    });
}

// Save User Data (deprecated with backend persistence)
function saveUserData() {}

// Calculate Age
function calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

// Calculate Goal Progress
function calculateGoalProgress() {
    // Simple calculation based on weight loss progress
    const totalWeightToLose = currentUser.currentWeight - currentUser.targetWeight;
    const weightLost = Math.max(0, (currentUser.startWeight || currentUser.currentWeight) - currentUser.currentWeight);
    const progress = totalWeightToLose > 0
        ? Math.min(100, Math.max(0, (weightLost / totalWeightToLose) * 100))
        : 0;
    return Math.round(progress);
}

// Share Profile
function shareProfile() {
    if (navigator.share) {
        navigator.share({
            title: 'My Fitness Profile - FitTracker',
            text: `Check out my fitness journey on FitTracker! I'm ${currentUser.firstName} and I'm working towards my fitness goals.`,
            url: window.location.href
        });
    } else {
        // Fallback for browsers that don't support Web Share API
        const shareText = `Check out my fitness profile: ${window.location.href}`;
        navigator.clipboard.writeText(shareText).then(() => {
            showMessage('Profile link copied to clipboard!', 'success');
        });
    }
}

// Show Message
function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Insert at the top of the main content
    const mainContent = document.querySelector('.profile-main');
    mainContent.insertBefore(messageDiv, mainContent.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Initialize Animations
function initializeAnimations() {
    // Animate stats on load
    animateStats();
    
    // Set up intersection observer for achievements
    setupAchievementObserver();
    
    // Set up progress bar animations
    animateProgressBars();
}

// Animate Stats
function animateStats() {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    statNumbers.forEach(stat => {
        const finalValue = parseInt(stat.textContent);
        let currentValue = 0;
        const increment = finalValue / 50;
        
        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= finalValue) {
                stat.textContent = finalValue;
                clearInterval(timer);
            } else {
                stat.textContent = Math.floor(currentValue);
            }
        }, 30);
    });
}

// Setup Achievement Observer
function setupAchievementObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'bounceIn 0.6s ease-out';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    const achievementCards = document.querySelectorAll('.achievement-card');
    achievementCards.forEach(card => observer.observe(card));
}

// Animate Progress Bars
function animateProgressBars() {
    const progressBars = document.querySelectorAll('.progress-fill');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const width = entry.target.style.width;
                entry.target.style.width = '0%';
                setTimeout(() => {
                    entry.target.style.width = width;
                }, 200);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    progressBars.forEach(bar => observer.observe(bar));
}

// Setup Event Listeners
function setupEventListeners() {
    // Real-time form validation
    setupFormValidation();
    
    // Goal progress updates
    setupGoalProgressUpdates();
    
    // Notification toggles
    setupNotificationToggles();
}

// Setup Form Validation
function setupFormValidation() {
    const forms = document.querySelectorAll('.profile-form');
    
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            input.addEventListener('blur', validateField);
            input.addEventListener('input', clearFieldError);
        });
    });
}

// Validate Field
function validateField(e) {
    const field = e.target;
    const value = field.value.trim();
    
    // Remove existing error
    clearFieldError(e);
    
    // Validate based on field type
    if (field.hasAttribute('required') && !value) {
        showFieldError(field, 'This field is required');
        return false;
    }
    
    if (field.type === 'email' && value && !isValidEmail(value)) {
        showFieldError(field, 'Please enter a valid email address');
        return false;
    }
    
    if (field.type === 'tel' && value && !isValidPhone(value)) {
        showFieldError(field, 'Please enter a valid phone number');
        return false;
    }
    
    if (field.type === 'number') {
        const min = field.getAttribute('min');
        const max = field.getAttribute('max');
        
        if (min && parseFloat(value) < parseFloat(min)) {
            showFieldError(field, `Value must be at least ${min}`);
            return false;
        }
        
        if (max && parseFloat(value) > parseFloat(max)) {
            showFieldError(field, `Value must be at most ${max}`);
            return false;
        }
    }
    
    return true;
}

// Show Field Error
function showFieldError(field, message) {
    field.style.borderColor = '#dc3545';
    
    let errorDiv = field.parentNode.querySelector('.field-error');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.style.color = '#dc3545';
        errorDiv.style.fontSize = '0.8rem';
        errorDiv.style.marginTop = '0.25rem';
        field.parentNode.appendChild(errorDiv);
    }
    
    errorDiv.textContent = message;
}

// Clear Field Error
function clearFieldError(e) {
    const field = e.target;
    field.style.borderColor = '';
    
    const errorDiv = field.parentNode.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

// Validate Email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate Phone
function isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// Setup Goal Progress Updates
function setupGoalProgressUpdates() {
    const goalInputs = document.querySelectorAll('#fitnessForm input[type="number"]');
    
    goalInputs.forEach(input => {
        input.addEventListener('input', () => {
            // Update progress in real-time
            setTimeout(updateGoalProgress, 500);
        });
    });
}

// Update Goal Progress
function updateGoalProgress() {
    const currentWeight = parseFloat(document.getElementById('currentWeight').value) || 0;
    const targetWeight = parseFloat(document.getElementById('targetWeight').value) || 0;
    
    if (currentWeight > 0 && targetWeight > 0) {
        const progress = calculateGoalProgress();
        document.getElementById('goalProgress').textContent = `${progress}%`;
        
        // Update progress bars
        const progressBars = document.querySelectorAll('.goal-progress .progress-fill');
        progressBars.forEach(bar => {
            if (bar.closest('.goal-item').textContent.includes('Lose Weight')) {
                bar.style.width = `${progress}%`;
                bar.nextElementSibling.textContent = `${progress}%`;
            }
        });
    }
}

// Setup Notification Toggles
function setupNotificationToggles() {
    const toggles = document.querySelectorAll('.toggle-switch input');
    
    toggles.forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const setting = e.target.name;
            const enabled = e.target.checked;
            
            // Update user data
            if (currentUser.notifications) {
                currentUser.notifications[setting] = enabled;
                saveUserData();
            }
            
            // Show feedback
            const status = enabled ? 'enabled' : 'disabled';
            showMessage(`${setting.replace(/([A-Z])/g, ' $1').toLowerCase()} notifications ${status}`, 'success');
        });
    });
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

// Export data function
function exportProfileData() {
    const dataStr = JSON.stringify(currentUser, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fitTracker-profile.json';
    link.click();
    
    URL.revokeObjectURL(url);
    showMessage('Profile data exported successfully!', 'success');
}

// Import data function
function importProfileData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            currentUser = { ...currentUser, ...importedData };
            loadUserData();
            saveUserData();
            showMessage('Profile data imported successfully!', 'success');
        } catch (error) {
            showMessage('Error importing profile data. Please check the file format.', 'error');
        }
    };
    reader.readAsText(file);
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S to save current form
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const activeForm = document.querySelector('.tab-content.active form');
        if (activeForm) {
            activeForm.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape to cancel current form
    if (e.key === 'Escape') {
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab) {
            const cancelBtn = activeTab.querySelector('button[type="button"]');
            if (cancelBtn) {
                cancelBtn.click();
            }
        }
    }
});

// Add smooth scrolling for internal links
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

// Initialize tooltips for better UX
function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(e) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = e.target.getAttribute('data-tooltip');
    tooltip.style.cssText = `
        position: absolute;
        background: #333;
        color: white;
        padding: 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
        z-index: 1000;
        pointer-events: none;
    `;
    
    document.body.appendChild(tooltip);
    
    const rect = e.target.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
    
    e.target._tooltip = tooltip;
}

function hideTooltip(e) {
    if (e.target._tooltip) {
        e.target._tooltip.remove();
        delete e.target._tooltip;
    }
}

// Load Diet Plan
async function loadDietPlan() {
    const loadingDiv = document.getElementById('diet-plan-loading');
    const emptyDiv = document.getElementById('diet-plan-empty');
    const contentDiv = document.getElementById('diet-plan-content');
    
    // Show loading
    loadingDiv.style.display = 'block';
    emptyDiv.style.display = 'none';
    contentDiv.style.display = 'none';
    
    try {
        const response = await fetch('/api/diet/current');
        const data = await response.json();
        
        if (data.ok && data.dietPlan) {
            // Hide loading and empty, show content
            loadingDiv.style.display = 'none';
            emptyDiv.style.display = 'none';
            contentDiv.style.display = 'block';
            
            // Display diet plan (simplified version for profile)
            const startDate = new Date(data.dietPlan.startDate).toLocaleDateString();
            const endDate = new Date(data.dietPlan.endDate).toLocaleDateString();
            
            contentDiv.innerHTML = `
                <div class="current-plan-info">
                    <div class="plan-header">
                        <h3><i class="fas fa-calendar-check"></i> ${data.dietPlan.name}</h3>
                        <p>${startDate} - ${endDate}</p>
                    </div>
                    <div class="plan-targets">
                        <div class="target-item">
                            <i class="fas fa-fire"></i>
                            <span>${data.dietPlan.targetCalories} calories/day</span>
                        </div>
                        <div class="target-item">
                            <i class="fas fa-drumstick-bite"></i>
                            <span>${data.dietPlan.targetProtein}g protein/day</span>
                        </div>
                        <div class="target-item">
                            <i class="fas fa-bread-slice"></i>
                            <span>${data.dietPlan.targetCarbs}g carbs/day</span>
                        </div>
                        <div class="target-item">
                            <i class="fas fa-seedling"></i>
                            <span>${data.dietPlan.targetFats}g fats/day</span>
                        </div>
                    </div>
                    <div class="plan-actions">
                        <a href="/diet" class="btn btn-primary">
                            <i class="fas fa-eye"></i> View Full Plan
                        </a>
                    </div>
                </div>
            `;
        } else {
            // Show empty state
            loadingDiv.style.display = 'none';
            emptyDiv.style.display = 'block';
            contentDiv.style.display = 'none';
        }
    } catch (err) {
        console.error('Error loading diet plan:', err);
        loadingDiv.style.display = 'none';
        emptyDiv.style.display = 'block';
        contentDiv.style.display = 'none';
    }
}

// Initialize tooltips when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeTooltips);
