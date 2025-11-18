// Diet Page JavaScript Functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the diet calculator
    initializeDietCalculator();
    
    // Initialize smooth scrolling for navigation
    initializeSmoothScrolling();
    
    // Initialize animations on scroll
    initializeScrollAnimations();
    
    // Initialize diet plan interactions
    initializeDietPlanInteractions();
    
    // Load user profile data
    loadUserProfileData();
    
    // Initialize diet plan generator
    initializeDietPlanGenerator();
});

// Diet Calculator Functionality
function initializeDietCalculator() {
    const calculateBtn = document.getElementById('calculate-btn');
    const resultsSection = document.getElementById('results-section');
    
    if (calculateBtn) {
        calculateBtn.addEventListener('click', function() {
            if (validateForm()) {
                calculateNutrition();
            }
        });
    }
    
    // Add real-time validation
    const formInputs = document.querySelectorAll('.calculator-form input, .calculator-form select');
    formInputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            clearFieldError(this);
        });
    });
}

// Form Validation
function validateForm() {
    const requiredFields = ['age', 'gender', 'weight', 'height', 'activity', 'goal'];
    let isValid = true;
    
    requiredFields.forEach(fieldName => {
        const field = document.getElementById(fieldName);
        if (!validateField(field)) {
            isValid = false;
        }
    });
    
    return isValid;
}

function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    let isValid = true;
    let errorMessage = '';
    
    // Clear previous error state
    clearFieldError(field);
    
    // Required field validation
    if (!value) {
        errorMessage = `${getFieldLabel(fieldName)} is required`;
        isValid = false;
    } else {
        // Specific validations
        switch (fieldName) {
            case 'age':
                const age = parseInt(value);
                if (age < 16 || age > 100) {
                    errorMessage = 'Age must be between 16 and 100';
                    isValid = false;
                }
                break;
                
            case 'weight':
                const weight = parseFloat(value);
                if (weight < 30 || weight > 200) {
                    errorMessage = 'Weight must be between 30 and 200 kg';
                    isValid = false;
                }
                break;
                
            case 'height':
                const height = parseInt(value);
                if (height < 120 || height > 250) {
                    errorMessage = 'Height must be between 120 and 250 cm';
                    isValid = false;
                }
                break;
        }
    }
    
    if (!isValid) {
        showFieldError(field, errorMessage);
    } else {
        showFieldSuccess(field);
    }
    
    return isValid;
}

function clearFieldError(field) {
    field.parentElement.classList.remove('error');
    const errorMsg = field.parentElement.querySelector('.error-message');
    if (errorMsg) {
        errorMsg.remove();
    }
}

function showFieldError(field, message) {
    field.parentElement.classList.add('error');
    field.parentElement.classList.remove('success');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    field.parentElement.appendChild(errorDiv);
}

function showFieldSuccess(field) {
    field.parentElement.classList.add('success');
    field.parentElement.classList.remove('error');
}

function getFieldLabel(fieldName) {
    const labels = {
        'age': 'Age',
        'gender': 'Gender',
        'weight': 'Weight',
        'height': 'Height',
        'activity': 'Activity Level',
        'goal': 'Fitness Goal'
    };
    return labels[fieldName] || fieldName;
}

// Nutrition Calculation - now uses API

function performNutritionCalculation(data) {
    // Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
    let bmr;
    if (data.gender === 'male') {
        bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age + 5;
    } else {
        bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age - 161;
    }
    
    // Activity multipliers
    const activityMultipliers = {
        'sedentary': 1.2,
        'light': 1.375,
        'moderate': 1.55,
        'active': 1.725,
        'very-active': 1.9
    };
    
    // Calculate TDEE (Total Daily Energy Expenditure)
    const tdee = bmr * activityMultipliers[data.activity];
    
    // Adjust calories based on goal
    let targetCalories;
    switch (data.goal) {
        case 'lose':
            targetCalories = tdee - 500; // 500 calorie deficit for 1 lb/week loss
            break;
        case 'maintain':
            targetCalories = tdee;
            break;
        case 'gain':
            targetCalories = tdee + 300; // 300 calorie surplus for gradual gain
            break;
        default:
            targetCalories = tdee;
    }
    
    // Calculate macronutrients - realistic protein intake based on goal and activity
    let proteinPerKg;
    if (data.goal === 'gain') {
        proteinPerKg = 2.0; // Higher protein for muscle gain
    } else if (data.activity === 'very-active' || data.activity === 'active') {
        proteinPerKg = 1.6; // Active individuals need more protein
    } else {
        proteinPerKg = 1.2; // Standard for moderate activity
    }
    
    const proteinGrams = Math.round(data.weight * proteinPerKg);
    const proteinCalories = proteinGrams * 4;
    
    const fatGrams = Math.round((targetCalories * 0.25) / 9); // 25% of calories from fat
    const fatCalories = fatGrams * 9;
    
    const carbCalories = targetCalories - proteinCalories - fatCalories;
    const carbGrams = Math.round(carbCalories / 4);
    
    return {
        calories: Math.round(targetCalories),
        protein: proteinGrams,
        carbs: carbGrams,
        fats: fatGrams,
        bmr: Math.round(bmr),
        tdee: Math.round(tdee)
    };
}

function displayResults(results) {
    const resultsSection = document.getElementById('results-section');
    
    // Animate the results section into view
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Animate the result values
    animateValue('calories', 0, results.calories, 2000);
    animateValue('protein', 0, results.protein, 2000);
    animateValue('carbs', 0, results.carbs, 2000);
    animateValue('fats', 0, results.fats, 2000);
    
    // Add success animation to result cards
    setTimeout(() => {
        const resultCards = document.querySelectorAll('.result-card');
        resultCards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('success');
            }, index * 200);
        });
    }, 1000);
}

function animateValue(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startTime = performance.now();
    
    function updateValue(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.round(start + (end - start) * easeOutQuart);
        
        element.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(updateValue);
        }
    }
    
    requestAnimationFrame(updateValue);
}

function showLoadingState() {
    const calculateBtn = document.getElementById('calculate-btn');
    calculateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';
    calculateBtn.disabled = true;
}

function hideLoadingState() {
    const calculateBtn = document.getElementById('calculate-btn');
    calculateBtn.innerHTML = '<i class="fas fa-calculator"></i> Calculate My Nutrition Plan';
    calculateBtn.disabled = false;
}

// Smooth Scrolling
function initializeSmoothScrolling() {
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    
    navLinks.forEach(link => {
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

// Scroll Animations
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.diet-plan-card, .meal-planning-card, .tip-card, .result-card');
    animatedElements.forEach(el => {
        el.classList.add('animate-on-scroll');
        observer.observe(el);
    });
}

// Diet Plan Interactions
function initializeDietPlanInteractions() {
    const planButtons = document.querySelectorAll('.plan-btn');
    
    planButtons.forEach(button => {
        button.addEventListener('click', function() {
            const planCard = this.closest('.diet-plan-card');
            const planName = planCard.querySelector('h3').textContent;
            
            // Show modal or navigate to detailed plan page
            showPlanDetails(planName);
        });
    });
}

function showPlanDetails(planName) {
    // Create a simple modal for plan details
    const modal = document.createElement('div');
    modal.className = 'plan-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${planName} - Detailed Information</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <p>This is a detailed view of the ${planName}. Here you would find:</p>
                <ul>
                    <li>Detailed meal plans</li>
                    <li>Recipe suggestions</li>
                    <li>Shopping lists</li>
                    <li>Progress tracking</li>
                    <li>Expert tips and advice</li>
                </ul>
                <p>This feature would be expanded in a full implementation with backend integration.</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary">Start This Plan</button>
                <button class="btn btn-secondary modal-close">Close</button>
            </div>
        </div>
    `;
    
    // Add modal styles
    const modalStyles = `
        .plan-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        }
        
        .modal-content {
            background: white;
            border-radius: 20px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            animation: slideInUp 0.3s ease;
        }
        
        .modal-header {
            padding: 2rem 2rem 1rem;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-header h2 {
            margin: 0;
            color: var(--secondary-color);
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 2rem;
            cursor: pointer;
            color: var(--text-muted);
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
        
        .modal-body ul {
            margin: 1rem 0;
            padding-left: 1.5rem;
        }
        
        .modal-body li {
            margin-bottom: 0.5rem;
            color: var(--text-muted);
        }
        
        .modal-footer {
            padding: 1rem 2rem 2rem;
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    
    // Add styles if not already added
    if (!document.getElementById('modal-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'modal-styles';
        styleSheet.textContent = modalStyles;
        document.head.appendChild(styleSheet);
    }
    
    document.body.appendChild(modal);
    
    // Close modal functionality
    const closeModal = () => {
        modal.remove();
    };
    
    modal.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Close on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
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

// Add some interactive features
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effects to meal list items
    const mealItems = document.querySelectorAll('.meal-list li');
    mealItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(10px)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0)';
        });
    });
    
    // Add click to copy functionality for result values
    const resultValues = document.querySelectorAll('.result-value');
    resultValues.forEach(value => {
        value.addEventListener('click', function() {
            const text = this.textContent;
            navigator.clipboard.writeText(text).then(() => {
                // Show a brief success message
                const originalText = this.textContent;
                this.textContent = 'Copied!';
                this.style.color = '#27ae60';
                
                setTimeout(() => {
                    this.textContent = originalText;
                    this.style.color = '';
                }, 1000);
            });
        });
        
        // Add cursor pointer to indicate clickability
        value.style.cursor = 'pointer';
        value.title = 'Click to copy';
    });
});

// Load user profile data to prefill calculator
async function loadUserProfileData() {
    try {
        const response = await fetch('/api/nutrition/profile');
        const data = await response.json();
        
        if (data.ok && data.profileData) {
            const profile = data.profileData;
            
            // Pre-fill form with user data
            if (profile.weight) document.getElementById('weight')?.setAttribute('value', profile.weight);
            if (profile.height) document.getElementById('height')?.setAttribute('value', profile.height);
            if (profile.gender) document.getElementById('gender').value = profile.gender;
            if (profile.activityLevel) document.getElementById('activity').value = profile.activityLevel;
            
            // Load and display nutrition goals if they exist
            if (data.nutritionGoals && data.nutritionGoals.targetCalories) {
                displayResults(data.nutritionGoals);
                document.getElementById('results-section').style.display = 'block';
                document.getElementById('generate-plan-section').style.display = 'block';
            }
        }
    } catch (err) {
        console.error('Error loading user profile:', err);
    }
}

// Initialize diet plan generator
function initializeDietPlanGenerator() {
    const generateBtn = document.getElementById('generate-plan-btn');
    
    if (generateBtn) {
        generateBtn.addEventListener('click', async function() {
            const duration = document.querySelector('input[name="plan-duration"]:checked')?.value || '7';
            
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Plan...';
            generateBtn.disabled = true;
            
            try {
                const response = await fetch('/api/diet/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ duration: parseInt(duration) })
                });
                
                const data = await response.json();
                
                if (data.ok && data.dietPlan) {
                    displayMealPlan(data.dietPlan);
                } else {
                    alert(data.message || 'Failed to generate meal plan');
                }
            } catch (err) {
                console.error('Error generating meal plan:', err);
                alert('An error occurred while generating your meal plan');
            } finally {
                generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate My Meal Plan';
                generateBtn.disabled = false;
            }
        });
    }
}

// Display meal plan with tabs for compact view
function displayMealPlan(dietPlan) {
    const displaySection = document.getElementById('meal-plan-display');
    const mealsContainer = document.getElementById('weekly-meals');
    
    if (!displaySection || !mealsContainer) return;
    
    // Clear previous content
    mealsContainer.innerHTML = '';
    
    // Add action buttons
    const actionBar = document.createElement('div');
    actionBar.className = 'meal-plan-actions';
    actionBar.innerHTML = `
        <button class="btn btn-secondary" onclick="generateShoppingList()">
            <i class="fas fa-shopping-cart"></i> Generate Shopping List
        </button>
        <button class="btn btn-secondary" onclick="printMealPlan()">
            <i class="fas fa-print"></i> Print Meal Plan
        </button>
    `;
    mealsContainer.appendChild(actionBar);
    
    // Create tabs for each day
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'meal-tabs';
    
    // Create tab buttons
    const tabsList = document.createElement('div');
    tabsList.className = 'tabs-list';
    
    dietPlan.dailyPlans.forEach((dayPlan, index) => {
        const dayName = new Date(dayPlan.date).toLocaleDateString('en-US', { weekday: 'short' });
        const date = new Date(dayPlan.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const tab = document.createElement('button');
        tab.className = 'tab-button' + (index === 0 ? ' active' : '');
        tab.dataset.day = index;
        tab.innerHTML = `
            <span class="tab-day">${dayName}</span>
            <span class="tab-date">${date}</span>
        `;
        tabsList.appendChild(tab);
    });
    
    tabsContainer.appendChild(tabsList);
    
    // Create tab content
    const contentContainer = document.createElement('div');
    contentContainer.className = 'tabs-content';
    
    dietPlan.dailyPlans.forEach((dayPlan, index) => {
        const tabContent = document.createElement('div');
        tabContent.className = 'tab-panel' + (index === 0 ? ' active' : '');
        tabContent.dataset.day = index;
        
        const dayNameFull = new Date(dayPlan.date).toLocaleDateString('en-US', { weekday: 'long' });
        const dateFull = new Date(dayPlan.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        
        tabContent.innerHTML = `
            <div class="tab-panel-header">
                <h3>${dayNameFull}</h3>
                <p>${dateFull}</p>
            </div>
            <div class="meals-grid">
                <div class="meal-card">
                    <div class="meal-icon breakfast">
                        <i class="fas fa-sun"></i>
                    </div>
                    <h4>Breakfast</h4>
                    <div class="meal-name">${dayPlan.breakfast.name}</div>
                    <div class="meal-info">
                        <span><i class="fas fa-fire"></i> ${dayPlan.breakfast.calories} cal</span>
                        <span><i class="fas fa-drumstick-bite"></i> ${dayPlan.breakfast.protein}g protein</span>
                    </div>
                    <div class="meal-actions">
                        <button class="btn-recipe" onclick="viewRecipe('${dayPlan.breakfast._id}')">
                            <i class="fas fa-book-open"></i> Recipe
                        </button>
                        <button class="btn-swap" onclick="swapDish('${dayPlan.breakfast._id}', 'breakfast', ${index})">
                            <i class="fas fa-exchange-alt"></i> Swap
                        </button>
                    </div>
                </div>
                
                <div class="meal-card">
                    <div class="meal-icon lunch">
                        <i class="fas fa-cloud-sun"></i>
                    </div>
                    <h4>Lunch</h4>
                    <div class="meal-name">${dayPlan.lunch.name}</div>
                    <div class="meal-info">
                        <span><i class="fas fa-fire"></i> ${dayPlan.lunch.calories} cal</span>
                        <span><i class="fas fa-drumstick-bite"></i> ${dayPlan.lunch.protein}g protein</span>
                    </div>
                    <div class="meal-actions">
                        <button class="btn-recipe" onclick="viewRecipe('${dayPlan.lunch._id}')">
                            <i class="fas fa-book-open"></i> Recipe
                        </button>
                        <button class="btn-swap" onclick="swapDish('${dayPlan.lunch._id}', 'lunch', ${index})">
                            <i class="fas fa-exchange-alt"></i> Swap
                        </button>
                    </div>
                </div>
                
                <div class="meal-card">
                    <div class="meal-icon dinner">
                        <i class="fas fa-moon"></i>
                    </div>
                    <h4>Dinner</h4>
                    <div class="meal-name">${dayPlan.dinner.name}</div>
                    <div class="meal-info">
                        <span><i class="fas fa-fire"></i> ${dayPlan.dinner.calories} cal</span>
                        <span><i class="fas fa-drumstick-bite"></i> ${dayPlan.dinner.protein}g protein</span>
                    </div>
                    <div class="meal-actions">
                        <button class="btn-recipe" onclick="viewRecipe('${dayPlan.dinner._id}')">
                            <i class="fas fa-book-open"></i> Recipe
                        </button>
                        <button class="btn-swap" onclick="swapDish('${dayPlan.dinner._id}', 'dinner', ${index})">
                            <i class="fas fa-exchange-alt"></i> Swap
                        </button>
                    </div>
                </div>
                
                ${dayPlan.snacks.map(snack => `
                    <div class="meal-card snack">
                        <div class="meal-icon snack-icon">
                            <i class="fas fa-apple-alt"></i>
                        </div>
                        <h4>Snack</h4>
                        <div class="meal-name">${snack.name}</div>
                        <div class="meal-info">
                            <span><i class="fas fa-fire"></i> ${snack.calories} cal</span>
                            <span><i class="fas fa-drumstick-bite"></i> ${snack.protein}g protein</span>
                        </div>
                        <div class="meal-actions">
                            <button class="btn-recipe" onclick="viewRecipe('${snack._id}')">
                                <i class="fas fa-book-open"></i> Recipe
                            </button>
                            <button class="btn-swap" onclick="swapDish('${snack._id}', 'snack', ${index})">
                                <i class="fas fa-exchange-alt"></i> Swap
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="day-summary">
                <div class="summary-card">
                    <i class="fas fa-fire"></i>
                    <div>
                        <span class="summary-value">${dayPlan.totalCalories}</span>
                        <span class="summary-label">Total Calories (Target: ${dietPlan.targetCalories})</span>
                    </div>
                </div>
                <div class="summary-card">
                    <i class="fas fa-drumstick-bite"></i>
                    <div>
                        <span class="summary-value">${dayPlan.totalProtein}g</span>
                        <span class="summary-label">Total Protein (Target: ${dietPlan.targetProtein}g)</span>
                    </div>
                </div>
                <div class="summary-card">
                    <i class="fas fa-bread-slice"></i>
                    <div>
                        <span class="summary-value">${dayPlan.totalCarbs}g</span>
                        <span class="summary-label">Total Carbs (Target: ${dietPlan.targetCarbs}g)</span>
                    </div>
                </div>
                <div class="summary-card">
                    <i class="fas fa-seedling"></i>
                    <div>
                        <span class="summary-value">${dayPlan.totalFats}g</span>
                        <span class="summary-label">Total Fats (Target: ${dietPlan.targetFats}g)</span>
                    </div>
                </div>
            </div>
        `;
        
        contentContainer.appendChild(tabContent);
    });
    
    mealsContainer.appendChild(tabsContainer);
    mealsContainer.appendChild(contentContainer);
    
    // Add tab switching functionality
    const tabButtons = tabsList.querySelectorAll('.tab-button');
    const tabPanels = contentContainer.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const day = button.dataset.day;
            
            // Remove active class from all
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));
            
            // Add active class to selected
            button.classList.add('active');
            document.querySelector(`.tab-panel[data-day="${day}"]`).classList.add('active');
        });
    });
    
    displaySection.style.display = 'block';
    displaySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Nutrition Calculation using API
async function calculateNutrition() {
    const formData = {
        age: parseInt(document.getElementById('age').value),
        gender: document.getElementById('gender').value,
        weight: parseFloat(document.getElementById('weight').value),
        height: parseInt(document.getElementById('height').value),
        activity: document.getElementById('activity').value,
        goal: document.getElementById('goal').value
    };
    
    // Show loading state
    showLoadingState();
    
    try {
        const response = await fetch('/api/nutrition/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.ok && data.nutrition) {
            displayResults(data.nutrition);
            
            // Show generate plan section
            document.getElementById('generate-plan-section').style.display = 'block';
            document.getElementById('generate-plan-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            alert(data.message || 'Failed to calculate nutrition needs');
        }
    } catch (err) {
        console.error('Error calculating nutrition:', err);
        alert('An error occurred while calculating your nutrition needs');
    } finally {
        hideLoadingState();
    }
}

// Swap dish functionality
async function swapDish(currentDishId, mealType, dayIndex) {
    // Get user's current diet plan
    try {
        const response = await fetch('/api/diet/current');
        const data = await response.json();
        
        if (!data.ok || !data.dietPlan) {
            alert('No active diet plan found');
            return;
        }
        
        // Get all dishes for this meal type
        const allDishesResponse = await fetch('/api/diet/dishes/' + mealType);
        const dishesData = await allDishesResponse.json();
        
        if (!dishesData.ok || dishesData.dishes.length === 0) {
            alert('No alternative dishes available');
            return;
        }
        
        // Filter out the current dish
        const alternativeDishes = dishesData.dishes.filter(d => d._id !== currentDishId);
        
        if (alternativeDishes.length === 0) {
            alert('No alternative dishes available');
            return;
        }
        
        // Show modal to select replacement
        showDishSwapModal(alternativeDishes, mealType, currentDishId, dayIndex);
        
    } catch (err) {
        console.error('Error loading dishes:', err);
        alert('Error loading dishes');
    }
}

// Show dish swap modal
function showDishSwapModal(dishes, mealType, currentDishId, dayIndex) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'swap-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Swap Dish</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <p>Choose a replacement for your ${mealType}:</p>
                <div class="dish-list">
                    ${dishes.map(dish => `
                        <div class="dish-option" onclick="selectDish('${dish._id}', '${mealType}', '${currentDishId}', ${dayIndex})">
                            <h4>${dish.name}</h4>
                            <p>${dish.calories} cal | ${dish.protein}g protein</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// Select dish and update
async function selectDish(newDishId, mealType, oldDishId, dayIndex) {
    try {
        const modal = document.querySelector('.swap-modal');
        modal.querySelector('.modal-body').innerHTML = '<p>Updating your meal plan...</p>';
        
        // Update the diet plan via API
        const response = await fetch('/api/diet/swap-dish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                newDishId: newDishId,
                oldDishId: oldDishId,
                mealType: mealType,
                dayIndex: dayIndex
            })
        });
        
        const data = await response.json();
        
        if (data.ok) {
            // Reload the diet plan to show updated dish
            displayMealPlan(data.dietPlan);
            modal.remove();
        } else {
            alert(data.message || 'Failed to swap dish');
            modal.remove();
        }
    } catch (err) {
        console.error('Error swapping dish:', err);
        alert('Error updating meal plan');
        document.querySelector('.swap-modal')?.remove();
    }
}

// View Recipe functionality
async function viewRecipe(dishId) {
    try {
        const response = await fetch(`/api/diet/dish/${dishId}`);
        const data = await response.json();
        
        if (!data.ok || !data.dish) {
            alert('Recipe not found');
            return;
        }
        
        const dish = data.dish;
        
        // Safety check for ingredients
        if (!dish.ingredients || !Array.isArray(dish.ingredients)) {
            dish.ingredients = ['Recipe details not available'];
        }
        
        // Instructions is a single string, convert to array for display
        let instructionsArray = ['Recipe instructions not available'];
        if (dish.instructions) {
            if (Array.isArray(dish.instructions)) {
                instructionsArray = dish.instructions;
            } else if (typeof dish.instructions === 'string') {
                // Split by sentence endings to create steps
                instructionsArray = dish.instructions.split(/[.!?]\s+/).filter(s => s.trim());
            }
        }
        
        // Create recipe modal
        const modal = document.createElement('div');
        modal.className = 'recipe-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${dish.name}</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="recipe-info">
                        <div class="recipe-stat">
                            <i class="fas fa-fire"></i>
                            <span><strong>${dish.calories}</strong> Calories</span>
                        </div>
                        <div class="recipe-stat">
                            <i class="fas fa-drumstick-bite"></i>
                            <span><strong>${dish.protein}g</strong> Protein</span>
                        </div>
                        <div class="recipe-stat">
                            <i class="fas fa-bread-slice"></i>
                            <span><strong>${dish.carbs}g</strong> Carbs</span>
                        </div>
                        <div class="recipe-stat">
                            <i class="fas fa-seedling"></i>
                            <span><strong>${dish.fats}g</strong> Fats</span>
                        </div>
                        ${dish.prepTime ? `
                        <div class="recipe-stat">
                            <i class="fas fa-clock"></i>
                            <span><strong>${dish.prepTime}</strong> Prep Time</span>
                        </div>
                        ` : ''}
                        ${dish.cookTime ? `
                        <div class="recipe-stat">
                            <i class="fas fa-hourglass-half"></i>
                            <span><strong>${dish.cookTime}</strong> Cook Time</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="recipe-section">
                        <h3><i class="fas fa-shopping-bag"></i> Ingredients</h3>
                        <ul class="ingredients-list">
                            ${dish.ingredients.map(ing => `<li>${ing}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="recipe-section">
                        <h3><i class="fas fa-list-ol"></i> Instructions</h3>
                        <ol class="instructions-list">
                            ${instructionsArray.map(step => `<li>${step}</li>`).join('')}
                        </ol>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        
    } catch (err) {
        console.error('Error loading recipe:', err);
        alert('Error loading recipe details');
    }
}

// Generate Shopping List
async function generateShoppingList() {
    try {
        const response = await fetch('/api/diet/current');
        const data = await response.json();
        
        if (!data.ok || !data.dietPlan) {
            alert('No active diet plan found');
            return;
        }
        
        const dietPlan = data.dietPlan;
        const allIngredients = new Map(); // ingredient name -> quantity
        
        // Collect ingredients from all dishes
        for (const dayPlan of dietPlan.dailyPlans) {
            const dishes = [dayPlan.breakfast, dayPlan.lunch, dayPlan.dinner, ...dayPlan.snacks].filter(d => d);
            
            for (const dish of dishes) {
                if (dish.ingredients) {
                    for (const ingredient of dish.ingredients) {
                        const ing = ingredient.split(/[,:]/)[0].trim(); // Take first part before colon or comma
                        const count = allIngredients.get(ing) || 0;
                        allIngredients.set(ing, count + 1);
                    }
                }
            }
        }
        
        // Convert to list and sort
        const ingredientsList = Array.from(allIngredients.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([ingredient, count]) => 
                count > 1 ? `- ${ingredient} (${count}x)` : `- ${ingredient}`
            );
        
        // Create shopping list modal
        const modal = document.createElement('div');
        modal.className = 'shopping-list-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Shopping List</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Here's your consolidated shopping list for the entire meal plan:</p>
                    <div class="shopping-list">
                        ${ingredientsList.join('\n')}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="printShoppingList()">
                            <i class="fas fa-print"></i> Print List
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        
    } catch (err) {
        console.error('Error generating shopping list:', err);
        alert('Error generating shopping list');
    }
}

// Print shopping list
function printShoppingList() {
    const modal = document.querySelector('.shopping-list-modal');
    if (modal) {
        window.print();
    }
}

// Print meal plan
function printMealPlan() {
    const mealPlanDisplay = document.getElementById('meal-plan-display');
    if (mealPlanDisplay) {
        // Create a printable version
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title>My Meal Plan</title>');
        printWindow.document.write('<style>body { font-family: Arial, sans-serif; padding: 20px; }</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(mealPlanDisplay.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
    }
}

// Export functions for potential external use
window.DietCalculator = {
    calculateNutrition: performNutritionCalculation,
    validateForm: validateForm,
    showPlanDetails: showPlanDetails,
    swapDish: swapDish,
    viewRecipe: viewRecipe
};
