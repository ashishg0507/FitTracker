const mongoose = require('mongoose');

const exerciseSetSchema = new mongoose.Schema({
    exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
    sets: { type: Number, default: 3 },
    reps: { type: String, default: '' }, // e.g., "8-12", "15-20", "30 seconds"
    weight: { type: Number, default: 0 }, // kg (0 for bodyweight)
    duration: { type: Number, default: 0 }, // minutes (for cardio/time-based exercises)
    restTime: { type: Number, default: 60 }, // seconds
    notes: { type: String, default: '' }
});

const dailyWorkoutSchema = new mongoose.Schema({
    date: { type: String, required: true }, // YYYY-MM-DD format
    workoutType: { 
        type: String, 
        enum: ['strength', 'cardio', 'flexibility', 'hiit', 'full-body', 'rest', 'active-recovery'], 
        default: 'full-body' 
    },
    exercises: [exerciseSetSchema],
    totalDuration: { type: Number, default: 0 }, // minutes
    estimatedCalories: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    notes: { type: String, default: '' }
});

const workoutPlanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, default: 'My Workout Plan' },
    description: { type: String, default: '' },
    fitnessLevel: { 
        type: String, 
        enum: ['beginner', 'intermediate', 'advanced'], 
        required: true 
    },
    primaryGoal: { 
        type: String, 
        enum: ['weight-loss', 'muscle-gain', 'strength', 'endurance', 'flexibility', 'general-fitness'], 
        required: true 
    },
    startDate: { type: String, required: true }, // YYYY-MM-DD
    endDate: { type: String, required: true }, // YYYY-MM-DD
    duration: { type: Number, required: true }, // days
    workoutsPerWeek: { type: Number, default: 3 },
    dailyWorkouts: [dailyWorkoutSchema],
    isActive: { type: Boolean, default: true },
    preferences: {
        equipment: { type: [String], default: [] },
        workoutDuration: { type: Number, default: 45 }, // minutes
        preferredTime: { type: String, default: 'morning' }
    },
    progress: {
        totalWorkoutsCompleted: { type: Number, default: 0 },
        totalCaloriesBurned: { type: Number, default: 0 },
        currentStreak: { type: Number, default: 0 },
        longestStreak: { type: Number, default: 0 }
    }
}, { timestamps: true });

// Indexes for efficient querying
workoutPlanSchema.index({ userId: 1, isActive: 1 });
workoutPlanSchema.index({ startDate: 1, endDate: 1 });
workoutPlanSchema.index({ fitnessLevel: 1, primaryGoal: 1 });

module.exports = mongoose.model('WorkoutPlan', workoutPlanSchema);

