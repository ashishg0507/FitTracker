const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
    dish: { type: mongoose.Schema.Types.ObjectId, ref: 'Dish', required: true },
    quantity: { type: Number, default: 1 } // can adjust portions
});

const dailyPlanSchema = new mongoose.Schema({
    date: { type: String, required: true }, // YYYY-MM-DD format
    breakfast: { type: mongoose.Schema.Types.ObjectId, ref: 'Dish' },
    lunch: { type: mongoose.Schema.Types.ObjectId, ref: 'Dish' },
    dinner: { type: mongoose.Schema.Types.ObjectId, ref: 'Dish' },
    snacks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Dish' }],
    totalCalories: { type: Number, default: 0 },
    totalProtein: { type: Number, default: 0 },
    totalCarbs: { type: Number, default: 0 },
    totalFats: { type: Number, default: 0 }
});

const dietPlanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, default: 'My Diet Plan' },
    description: { type: String, default: '' },
    startDate: { type: String, required: true }, // YYYY-MM-DD
    endDate: { type: String, required: true }, // YYYY-MM-DD
    targetCalories: { type: Number, required: true },
    targetProtein: { type: Number, required: true },
    targetCarbs: { type: Number, required: true },
    targetFats: { type: Number, required: true },
    dailyPlans: [dailyPlanSchema],
    isActive: { type: Boolean, default: true },
    preferences: {
        dietaryRestrictions: { type: [String], default: [] },
        allergens: { type: [String], default: [] }
    }
}, { timestamps: true });

// Indexes for efficient querying
dietPlanSchema.index({ userId: 1, isActive: 1 });
dietPlanSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('DietPlan', dietPlanSchema);

