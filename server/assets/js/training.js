// Training Page JavaScript Functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the workout generator
    initializeWorkoutGenerator();
    
    // Load user profile data
    loadUserProfileData();
    
    // Initialize exercise library
    initializeExerciseLibrary();
    
    // Load current workout plan if exists
    loadCurrentWorkoutPlan();
});

// Workout Generator Functionality
function initializeWorkoutGenerator() {
    const generateBtn = document.getElementById('generate-workout-btn');
    
    if (generateBtn) {
        generateBtn.addEventListener('click', function() {
            if (validateWorkoutForm()) {
                generateWorkoutPlan();
            }
        });
    }
}

// Form Validation
function validateWorkoutForm() {
    const fitnessLevel = document.getElementById('fitness-level').value;
    const workoutGoal = document.getElementById('workout-goal').value;
    const duration = document.getElementById('plan-duration').value;
    const workoutsPerWeek = document.getElementById('workouts-per-week').value;
    
    if (!fitnessLevel || !workoutGoal || !duration || !workoutsPerWeek) {
        alert('Please fill in all fields');
        return false;
    }
    
    return true;
}

// Generate Workout Plan
async function generateWorkoutPlan() {
    const formData = {
        fitnessLevel: document.getElementById('fitness-level').value,
        primaryGoal: document.getElementById('workout-goal').value,
        duration: parseInt(document.getElementById('plan-duration').value),
        workoutsPerWeek: parseInt(document.getElementById('workouts-per-week').value)
    };
    
    // Show loading state
    const generateBtn = document.getElementById('generate-workout-btn');
    const originalText = generateBtn.innerHTML;
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Plan...';
    
    try {
        const response = await fetch('/api/training/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.ok && data.workoutPlan) {
            // Invalidate cache after generating new plan
            invalidateCache('workoutPlan');
            displayWorkoutPlan(data.workoutPlan);
            document.getElementById('workout-plan-display').style.display = 'block';
            document.getElementById('workout-plan-display').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            alert(data.message || 'Failed to generate workout plan');
        }
    } catch (err) {
        console.error('Error generating workout plan:', err);
        alert('An error occurred while generating your workout plan');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalText;
    }
}

// Display Workout Plan
function displayWorkoutPlan(workoutPlan) {
    const displaySection = document.getElementById('workout-plan-display');
    const weeklyWorkouts = document.getElementById('weekly-workouts');
    const statsDiv = document.getElementById('workout-plan-stats');
    
    // Display stats
    const totalWorkouts = workoutPlan.dailyWorkouts.filter(w => w.workoutType !== 'rest').length;
    const totalCalories = workoutPlan.dailyWorkouts.reduce((sum, w) => sum + (w.estimatedCalories || 0), 0);
    const avgDuration = Math.round(workoutPlan.dailyWorkouts.reduce((sum, w) => sum + (w.totalDuration || 0), 0) / workoutPlan.dailyWorkouts.length);
    
    statsDiv.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-calendar-check"></i></div>
            <div class="stat-value">${totalWorkouts}</div>
            <div class="stat-label">Workouts</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-fire"></i></div>
            <div class="stat-value">${totalCalories}</div>
            <div class="stat-label">Total Calories</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-clock"></i></div>
            <div class="stat-value">${avgDuration} min</div>
            <div class="stat-label">Avg Duration</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-trophy"></i></div>
            <div class="stat-value">${workoutPlan.progress?.currentStreak || 0}</div>
            <div class="stat-label">Day Streak</div>
        </div>
    `;
    
    // Create tabs container
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'tabs-list';
    
    // Create content container
    const contentContainer = document.createElement('div');
    contentContainer.className = 'tabs-content';
    
    // Generate tabs and content for each day
    workoutPlan.dailyWorkouts.forEach((dailyWorkout, index) => {
        const date = new Date(dailyWorkout.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dayNum = date.getDate();
        
        // Create tab button
        const tabButton = document.createElement('div');
        tabButton.className = `tab-button ${index === 0 ? 'active' : ''} ${dailyWorkout.completed ? 'completed' : ''}`;
        tabButton.dataset.day = index;
        tabButton.innerHTML = `
            <div class="tab-day">${dayName}</div>
            <div class="tab-date">${dayNum}</div>
            ${dailyWorkout.completed ? '<i class="fas fa-check-circle" style="margin-top: 0.25rem; color: #27ae60;"></i>' : ''}
        `;
        tabsContainer.appendChild(tabButton);
        
        // Create tab panel
        const tabPanel = document.createElement('div');
        tabPanel.className = `tab-panel ${index === 0 ? 'active' : ''}`;
        tabPanel.dataset.day = index;
        
        if (dailyWorkout.workoutType === 'rest') {
            tabPanel.innerHTML = `
                <div class="tab-panel-header">
                    <h3>${date.toLocaleDateString('en-US', { weekday: 'long' })} - Rest Day</h3>
                    <p>${dateStr}</p>
                </div>
                <div class="rest-day-content">
                    <i class="fas fa-bed"></i>
                    <h3>Rest Day</h3>
                    <p>Take a well-deserved rest. Recovery is essential for progress!</p>
                </div>
            `;
        } else {
            const exercisesList = dailyWorkout.exercises.map(ex => {
                const exercise = ex.exercise;
                if (!exercise) return '';
                
                return `
                    <div class="exercise-item">
                        <div class="exercise-info">
                            <h4>${exercise.name}</h4>
                            <p class="exercise-meta">${exercise.muscleGroups?.join(', ') || 'Full Body'}</p>
                        </div>
                        <div class="exercise-details">
                            ${ex.sets ? `<span class="detail-badge"><i class="fas fa-redo"></i> ${ex.sets} sets</span>` : ''}
                            ${ex.reps ? `<span class="detail-badge"><i class="fas fa-hashtag"></i> ${ex.reps} reps</span>` : ''}
                            ${ex.duration ? `<span class="detail-badge"><i class="fas fa-clock"></i> ${ex.duration} min</span>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
            
            tabPanel.innerHTML = `
                <div class="tab-panel-header">
                    <h3>${date.toLocaleDateString('en-US', { weekday: 'long' })}</h3>
                    <p>${dateStr}</p>
                </div>
                <div class="workout-day-summary">
                    <div class="summary-badge ${dailyWorkout.workoutType}">
                        <span class="workout-type-badge ${dailyWorkout.workoutType}">${dailyWorkout.workoutType.charAt(0).toUpperCase() + dailyWorkout.workoutType.slice(1)}</span>
                    </div>
                    <div class="workout-stats">
                        <span><i class="fas fa-clock"></i> ${dailyWorkout.totalDuration} min</span>
                        <span><i class="fas fa-fire"></i> ${dailyWorkout.estimatedCalories} cal</span>
                        <span><i class="fas fa-dumbbell"></i> ${dailyWorkout.exercises.length} exercises</span>
                    </div>
                </div>
                <div class="exercises-list">
                    ${exercisesList}
                </div>
                <div class="workout-actions">
                    ${!dailyWorkout.completed ? `
                        <button class="btn btn-primary btn-full" onclick="completeWorkout('${workoutPlan._id}', ${index})">
                            <i class="fas fa-check"></i> Mark as Completed
                        </button>
                    ` : `
                        <div class="completed-badge"><i class="fas fa-check-circle"></i> Completed</div>
                    `}
                </div>
            `;
        }
        
        contentContainer.appendChild(tabPanel);
    });
    
    // Clear and add tabs and content
    weeklyWorkouts.innerHTML = '';
    weeklyWorkouts.appendChild(tabsContainer);
    weeklyWorkouts.appendChild(contentContainer);
    
    // Add tab switching functionality
    const tabButtons = tabsContainer.querySelectorAll('.tab-button');
    const tabPanels = contentContainer.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const dayIndex = parseInt(button.dataset.day);
            
            // Remove active class from all
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));
            
            // Add active class to selected
            button.classList.add('active');
            tabPanels[dayIndex].classList.add('active');
        });
    });
}

// Complete Workout
async function completeWorkout(workoutPlanId, dayIndex) {
    try {
        const response = await fetch('/api/training/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workoutPlanId, dayIndex })
        });
        
        const data = await response.json();
        
        if (data.ok && data.workoutPlan) {
            // Invalidate cache after completing workout
            invalidateCache('workoutPlan');
            displayWorkoutPlan(data.workoutPlan);
            alert('Workout marked as completed! Great job! 🎉');
        } else {
            alert(data.message || 'Failed to mark workout as completed');
        }
    } catch (err) {
        console.error('Error completing workout:', err);
        alert('An error occurred while marking workout as completed');
    }
}

// Load Current Workout Plan
async function loadCurrentWorkoutPlan() {
    try {
        const response = await cachedFetch('/api/training/current', {}, 'workoutPlan', CACHE_TTL.workoutPlan);
        const data = await response.json();
        
        if (data.ok && data.workoutPlan) {
            displayWorkoutPlan(data.workoutPlan);
            document.getElementById('workout-plan-display').style.display = 'block';
        }
    } catch (err) {
        console.error('Error loading current workout plan:', err);
    }
}

// Load User Profile Data
async function loadUserProfileData() {
    try {
        // Try to get profile data from the main profile API first
        const profileResponse = await cachedFetch('/api/profile', {}, 'profile', CACHE_TTL.profile);
        const profileData = await profileResponse.json();
        
        if (profileData.ok && profileData.user) {
            const user = profileData.user;
            
            // Pre-fill fitness level - use explicit fitnessLevel if set, otherwise derive from activityLevel
            if (user.fitnessLevel) {
                document.getElementById('fitness-level').value = user.fitnessLevel;
            } else if (user.activityLevel) {
                // Map activity level to fitness level as fallback
                const levelMap = {
                    'sedentary': 'beginner',
                    'light': 'beginner',
                    'moderate': 'intermediate',
                    'active': 'advanced',
                    'very-active': 'advanced'
                };
                const fitnessLevel = levelMap[user.activityLevel] || 'beginner';
                document.getElementById('fitness-level').value = fitnessLevel;
            }
            
            // Pre-fill primary workout goal - use explicit primaryWorkoutGoal if set, otherwise derive from goals
            if (user.primaryWorkoutGoal) {
                document.getElementById('workout-goal').value = user.primaryWorkoutGoal;
            } else if (user.goals && user.goals.length > 0) {
                // Map user goals to workout goals
                const goalMap = {
                    'build-muscle': 'muscle-gain',
                    'lose-weight': 'weight-loss',
                    'improve-strength': 'strength',
                    'improve-endurance': 'endurance',
                    'increase-flexibility': 'flexibility',
                    'general-fitness': 'general-fitness'
                };
                // Try to find matching goal
                let workoutGoal = 'general-fitness';
                for (const goal of user.goals) {
                    if (goalMap[goal]) {
                        workoutGoal = goalMap[goal];
                        break;
                    }
                }
                document.getElementById('workout-goal').value = workoutGoal;
            }
            
            // Pre-fill workouts per week
            if (user.workoutFrequency && user.workoutFrequency > 0) {
                document.getElementById('workouts-per-week').value = user.workoutFrequency;
            }
        }
        
        // Also try the training profile API as fallback
        const trainingResponse = await cachedFetch('/api/training/profile', {}, 'trainingProfile', CACHE_TTL.trainingProfile);
        const trainingData = await trainingResponse.json();
        
        if (trainingData.ok && trainingData.profileData) {
            const profile = trainingData.profileData;
            
            // Only fill if not already filled from main profile
            if (!document.getElementById('fitness-level').value && profile.activityLevel) {
                const levelMap = {
                    'sedentary': 'beginner',
                    'light': 'beginner',
                    'moderate': 'intermediate',
                    'active': 'advanced',
                    'very-active': 'advanced'
                };
                const fitnessLevel = levelMap[profile.activityLevel] || 'beginner';
                document.getElementById('fitness-level').value = fitnessLevel;
            }
            
            if (!document.getElementById('workout-goal').value && profile.goals && profile.goals.length > 0) {
                const goalMap = {
                    'build-muscle': 'muscle-gain',
                    'lose-weight': 'weight-loss',
                    'improve-strength': 'strength',
                    'improve-endurance': 'endurance',
                    'increase-flexibility': 'flexibility'
                };
                const workoutGoal = goalMap[profile.goals[0]] || 'general-fitness';
                document.getElementById('workout-goal').value = workoutGoal;
            }
            
            if (!document.getElementById('workouts-per-week').value && profile.workoutFrequency) {
                document.getElementById('workouts-per-week').value = profile.workoutFrequency;
            }
        }
    } catch (err) {
        console.error('Error loading user profile:', err);
    }
}

// Initialize Exercise Library
function initializeExerciseLibrary() {
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            categoryBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            loadExercises(this.dataset.category);
        });
    });
    
    // Load all exercises by default
    loadExercises('all');
}

// Load Exercises
async function loadExercises(category) {
    const exercisesGrid = document.getElementById('exercises-grid');
    exercisesGrid.innerHTML = '<div class="exercise-loading"><i class="fas fa-spinner fa-spin"></i> Loading exercises...</div>';
    
    try {
        // Use 'all' to get all exercises, or specific category
        const categoryParam = category === 'all' ? 'all' : category;
        const response = await cachedFetch(`/api/training/exercises/${categoryParam}`, {}, `exercises_${categoryParam}`, CACHE_TTL.exercises);
        const data = await response.json();
        
        console.log('Exercise API response:', data);
        
        if (!data.ok) {
            throw new Error(data.message || 'Failed to load exercises');
        }
        
        const exercises = data.exercises || [];
        console.log(`Loaded ${exercises.length} exercises for category: ${categoryParam}`);
        
        if (exercises.length === 0) {
            exercisesGrid.innerHTML = '<div class="exercise-empty"><p>No exercises found in database. Please run: <code>npm run seed-exercises</code></p></div>';
            return;
        }
        
        exercisesGrid.innerHTML = exercises.map(exercise => `
            <div class="exercise-card">
                <div class="exercise-card-header">
                    <h3>${exercise.name}</h3>
                    <span class="exercise-category-badge ${exercise.category}">${exercise.category}</span>
                </div>
                <div class="exercise-card-body">
                    <p class="exercise-description">${exercise.description || 'No description available'}</p>
                    <div class="exercise-meta">
                        ${exercise.muscleGroups && exercise.muscleGroups.length > 0 ? `
                            <div class="meta-item">
                                <i class="fas fa-dumbbell"></i>
                                <span>${exercise.muscleGroups.join(', ')}</span>
                            </div>
                        ` : ''}
                        <div class="meta-item">
                            <i class="fas fa-signal"></i>
                            <span>${exercise.difficulty || 'Beginner'}</span>
                        </div>
                        ${exercise.equipment ? `
                            <div class="meta-item">
                                <i class="fas fa-tools"></i>
                                <span>${exercise.equipment}</span>
                            </div>
                        ` : ''}
                    </div>
                    ${exercise.instructions && exercise.instructions.length > 0 ? `
                        <div class="exercise-instructions">
                            <h4>Instructions:</h4>
                            <ol>
                                ${exercise.instructions.map(inst => `<li>${inst}</li>`).join('')}
                            </ol>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error loading exercises:', err);
        exercisesGrid.innerHTML = `
            <div class="exercise-error">
                <p><strong>Error loading exercises:</strong> ${err.message || 'Unknown error'}</p>
                <p style="margin-top: 1rem; font-size: 0.9rem; color: var(--text-muted);">
                    Make sure you've run: <code>npm run seed-exercises</code>
                </p>
            </div>
        `;
    }
}

