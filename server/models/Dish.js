const mongoose = require('mongoose');

const dishSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    category: { type: String, required: true, enum: ['breakfast', 'lunch', 'dinner', 'snack'], trim: true },
    calories: { type: Number, required: true },
    protein: { type: Number, required: true }, // grams
    carbs: { type: Number, required: true }, // grams
    fats: { type: Number, required: true }, // grams
    fiber: { type: Number, default: 0 }, // grams
    ingredients: { type: [String], default: [] },
    instructions: { type: String, trim: true, default: '' },
    prepTime: { type: Number, default: 0 }, // minutes
    cookTime: { type: Number, default: 0 }, // minutes
    servings: { type: Number, default: 1 },
    imageUrl: { type: String, trim: true, default: '' },
    tags: { type: [String], default: [] }, // e.g., 'vegan', 'gluten-free', 'high-protein'
    dishType: { type: String, default: 'general' }, // 'general', 'keto', 'mediterranean', 'high-protein', 'balanced'
    dietaryType: { type: String, enum: ['vegetarian', 'vegan', 'non-vegetarian', 'eggetarian'], default: 'vegetarian' }, // dietary classification
    contains: { type: [String], default: [] }, // e.g., 'chicken', 'fish', 'eggs', 'dairy'
    restrictions: { type: [String], default: [] }, // e.g., 'no-beef', 'no-pork', 'no-seafood', 'no-dairy', 'halal', 'kosher'
    cuisineType: { type: String, default: 'international' } // 'indian', 'mediterranean', 'mexican', etc.
}, { timestamps: true });

// Index for efficient querying
dishSchema.index({ category: 1 });
dishSchema.index({ dishType: 1 });
dishSchema.index({ calories: 1 });

module.exports = mongoose.model('Dish', dishSchema);

