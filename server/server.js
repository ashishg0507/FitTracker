const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const mongoose = require('mongoose');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('redis');
const Razorpay = require('razorpay');

// Models
const User = require('./models/User');
const Dish = require('./models/Dish');
const DietPlan = require('./models/DietPlan');
const Exercise = require('./models/Exercise');
const WorkoutPlan = require('./models/WorkoutPlan');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== REDIS SETUP (for caching) =====
const REDIS_URL = process.env.REDIS_URL;

let redisClient;

if (REDIS_URL) {
    redisClient = createClient({ url: REDIS_URL });

    redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
    });

    redisClient.connect()
        .then(() => console.log('Redis connected'))
        .catch((err) => {
            console.error('Redis connection failed, continuing without cache:', err);
            redisClient = null;
        });
} else {
    console.warn('REDIS_URL not set. Redis caching is disabled.');
}

// Simple cache helpers
async function cacheGet(key) {
    if (!redisClient) return null;
    try {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    } catch (err) {
        console.error('Redis get error:', err);
        return null;
    }
}

async function cacheSet(key, value, ttlSeconds = 300) {
    if (!redisClient) return;
    try {
        await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch (err) {
        console.error('Redis set error:', err);
    }
}

async function cacheDel(key) {
    if (!redisClient) return;
    try {
        await redisClient.del(key);
    } catch (err) {
        console.error('Redis delete error:', err);
    }
}

async function cacheDelPattern(pattern) {
    if (!redisClient) return;
    try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
    } catch (err) {
        console.error('Redis delete pattern error:', err);
    }
}

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cookie parser (for JWT)
app.use(cookieParser());

// Sessions (kept for flash-like behaviors; auth will use JWT)
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// JWT helpers
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
const AUTH_COOKIE_NAME = 'auth_token';

function signJwt(payload, options = {}) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: options.expiresIn || '1d' });
}

function verifyJwt(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (_) {
        return null;
    }
}

function setAuthCookie(res, token, remember) {
    const oneDayMs = 24 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * oneDayMs;
    res.cookie(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: remember ? thirtyDaysMs : oneDayMs,
        path: '/',
    });
}

function clearAuthCookie(res) {
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
}

function requireAuth(req, res, next) {
    const token = req.cookies[AUTH_COOKIE_NAME];
    const decoded = token ? verifyJwt(token) : null;
    if (!decoded) {
        if (req.headers['content-type'] === 'application/json' || req.xhr) {
            return res.status(401).json({ ok: false, message: 'Unauthorized' });
        }
        return res.redirect('/signin');
    }
    req.user = { id: decoded.id, username: decoded.username, email: decoded.email };
    next();
}

// Expose user to templates from JWT
app.use((req, res, next) => {
    const token = req.cookies[AUTH_COOKIE_NAME];
    const decoded = token ? verifyJwt(token) : null;
    res.locals.currentUser = decoded ? { username: decoded.username, email: decoded.email } : null;
    next();
});

// Static assets (prefer server-local, fallback to project assets)
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fittracker';
mongoose.connect(MONGO_URI)
	.then(() => console.log('MongoDB connected'))
	.catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
	res.render('home', { title: 'Fitness Tracker Dashboard' });
});

app.get('/pricing', (req, res) => {
	res.render('pricing', { title: 'Fit Track - Pricing Plans' });
});

app.get('/profile', requireAuth, (req, res) => {
	res.render('profile', { title: 'Profile - FitTracker' });
});

// Profile API - get current user
app.get('/api/profile', requireAuth, async (req, res) => {
    try {
        const cacheKey = `profile:${req.user.id}`;
        const cached = await cacheGet(cacheKey);
        if (cached) {
            return res.json({ ok: true, user: cached, cached: true });
        }

        const user = await User.findById(req.user.id).lean();
        if (!user) {
            return res.status(404).json({ ok: false, message: 'User not found' });
        }
        const { passwordHash, __v, ...safeUser } = user;

        await cacheSet(cacheKey, safeUser, 300); // 5 min TTL
        return res.json({ ok: true, user: safeUser, cached: false });
    } catch (err) {
        console.error('Get profile error:', err);
        return res.status(500).json({ ok: false, message: 'Internal server error.' });
    }
});

// Profile API - update current user
app.put('/api/profile', requireAuth, async (req, res) => {
    try {
        const allowedFields = [
            'firstName','lastName','phone','dateOfBirth','gender','bio','avatarUrl',
            'height','currentWeight','targetWeight','bodyFat','goals','activityLevel',
            'fitnessLevel','primaryWorkoutGoal','workoutDuration','workoutFrequency',
            'preferredTime','cardio','strength','flexibility','notifications','email','dietaryPreferences'
        ];
        const update = {};
        for (const key of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                update[key] = req.body[key];
            }
        }

        // Ensure arrays are arrays
        if (update.goals && !Array.isArray(update.goals)) update.goals = [update.goals].filter(Boolean);
        if (update.cardio && !Array.isArray(update.cardio)) update.cardio = [update.cardio].filter(Boolean);
        if (update.strength && !Array.isArray(update.strength)) update.strength = [update.strength].filter(Boolean);
        if (update.flexibility && !Array.isArray(update.flexibility)) update.flexibility = [update.flexibility].filter(Boolean);

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: update },
            { new: true, runValidators: true }
        ).lean();

        if (!user) {
            return res.status(404).json({ ok: false, message: 'User not found' });
        }

        // Clear related caches when profile is updated
        if (redisClient) {
            // Clear training profile cache if fitness-related fields were updated
            const fitnessFields = ['fitnessLevel', 'primaryWorkoutGoal', 'activityLevel', 'goals', 'workoutFrequency', 'workoutDuration', 'height', 'currentWeight', 'targetWeight'];
            const hasFitnessUpdate = fitnessFields.some(field => update.hasOwnProperty(field));
            if (hasFitnessUpdate) {
                await redisClient.del(`training:profile:${req.user.id}`);
            }

            // Clear profile cache
            await redisClient.del(`profile:${req.user.id}`);
        }

        const { passwordHash, __v, ...safeUser } = user;
        return res.json({ ok: true, user: safeUser });
    } catch (err) {
        console.error('Update profile error:', err);
        // Handle unique email conflict
        if (err && err.code === 11000) {
            return res.status(409).json({ ok: false, message: 'Email already in use.' });
        }
        return res.status(500).json({ ok: false, message: 'Internal server error.' });
    }
});

app.get('/about', (req, res) => {
	res.render('marketing/about', { title: 'About Us - FitTack' });
});

app.get('/contact', (req, res) => {
	res.render('marketing/contact', { title: 'Contact Us - FitTack' });
});

app.get('/signin', (req, res) => {
	res.render('auth/signin', { title: 'FitLife - Sign In' });
});

app.get('/signup', (req, res) => {
	res.render('auth/signup', { title: 'FitLife - Sign Up' });
});

app.get('/diet', requireAuth, (req, res) => {
	res.render('diet', { title: 'Nutrition & Diet Plans - FitTracker' });
});

// Auth routes
app.post('/signup', async (req, res) => {
	try {
		const { username, email, password } = req.body;
		if (!username || !email || !password) {
			return res.status(400).json({ ok: false, message: 'All fields are required.' });
		}

		const existingUser = await User.findOne({ $or: [{ username }, { email }] });
		if (existingUser) {
			return res.status(409).json({ ok: false, message: 'Username or email already in use.' });
		}

		const passwordHash = await bcrypt.hash(password, 10);
		await User.create({ username, email, passwordHash });
		return res.json({ ok: true, redirect: '/signin' });
	} catch (err) {
		console.error('Signup error:', err);
		return res.status(500).json({ ok: false, message: 'Internal server error.' });
	}
});

app.post('/signin', async (req, res) => {
	try {
        const { username, password, rememberMe } = req.body;
		if (!username || !password) {
			return res.status(400).json({ ok: false, message: 'Username and password required.' });
		}

		const user = await User.findOne({ username });
		if (!user) {
			return res.status(401).json({ ok: false, message: 'Invalid credentials.' });
		}

		const match = await bcrypt.compare(password, user.passwordHash);
		if (!match) {
			return res.status(401).json({ ok: false, message: 'Invalid credentials.' });
		}

        const token = signJwt({ id: user._id.toString(), username: user.username, email: user.email }, { expiresIn: rememberMe ? '30d' : '1d' });
        setAuthCookie(res, token, !!rememberMe);
        return res.json({ ok: true, redirect: '/' });
	} catch (err) {
		console.error('Signin error:', err);
		return res.status(500).json({ ok: false, message: 'Internal server error.' });
	}
});

app.post('/signout', (req, res) => {
    clearAuthCookie(res);
    res.redirect('/signin');
});

app.get('/training', requireAuth, (req, res) => {
	res.render('training', { title: 'Start Training - FitTracker' });
});

// ===== DIET & NUTRITION API ROUTES =====

// Get user profile nutrition data
app.get('/api/nutrition/profile', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).lean();
        if (!user) {
            return res.status(404).json({ ok: false, message: 'User not found' });
        }
        return res.json({ 
            ok: true, 
            nutritionGoals: user.nutritionGoals || {},
            profileData: {
                age: user.dateOfBirth ? new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear() : null,
                gender: user.gender,
                weight: user.currentWeight,
                height: user.height,
                activityLevel: user.activityLevel,
                goals: user.goals
            }
        });
    } catch (err) {
        console.error('Get nutrition profile error:', err);
        return res.status(500).json({ ok: false, message: 'Internal server error.' });
    }
});

// Calculate nutrition requirements
app.post('/api/nutrition/calculate', requireAuth, async (req, res) => {
    try {
        const { age, gender, weight, height, activity, goal } = req.body;
        
        if (!age || !gender || !weight || !height || !activity || !goal) {
            return res.status(400).json({ ok: false, message: 'All fields are required' });
        }

        // Calculate BMR using Mifflin-St Jeor Equation
        let bmr;
        if (gender === 'male') {
            bmr = 10 * weight + 6.25 * height - 5 * age + 5;
        } else {
            bmr = 10 * weight + 6.25 * height - 5 * age - 161;
        }

        // Activity multipliers
        const activityMultipliers = {
            'sedentary': 1.2,
            'light': 1.375,
            'moderate': 1.55,
            'active': 1.725,
            'very-active': 1.9
        };

        const tdee = bmr * activityMultipliers[activity];

        // Adjust calories based on goal
        let targetCalories;
        switch (goal) {
            case 'lose':
                targetCalories = tdee - 500;
                break;
            case 'maintain':
                targetCalories = tdee;
                break;
            case 'gain':
                targetCalories = tdee + 300;
                break;
            default:
                targetCalories = tdee;
        }

        // Calculate macronutrients - realistic protein intake based on goal and activity
        let proteinPerKg;
        if (goal === 'gain') {
            proteinPerKg = 2.0; // Higher protein for muscle gain
        } else if (activity === 'very-active' || activity === 'active') {
            proteinPerKg = 1.6; // Active individuals need more protein
        } else {
            proteinPerKg = 1.2; // Standard for moderate activity
        }
        
        const proteinGrams = Math.round(weight * proteinPerKg);
        const fatGrams = Math.round((targetCalories * 0.25) / 9);
        const carbGrams = Math.round((targetCalories - (proteinGrams * 4) - (fatGrams * 9)) / 4);

        const nutrition = {
            calories: Math.round(targetCalories),
            protein: proteinGrams,
            carbs: carbGrams,
            fats: fatGrams,
            bmr: Math.round(bmr),
            tdee: Math.round(tdee)
        };

        // Save to user profile
        await User.findByIdAndUpdate(req.user.id, {
            $set: {
                'nutritionGoals.targetCalories': nutrition.calories,
                'nutritionGoals.targetProtein': nutrition.protein,
                'nutritionGoals.targetCarbs': nutrition.carbs,
                'nutritionGoals.targetFats': nutrition.fats
            }
        });

        return res.json({ ok: true, nutrition });
    } catch (err) {
        console.error('Calculate nutrition error:', err);
        return res.status(500).json({ ok: false, message: 'Internal server error.' });
    }
});

// Generate diet plan
app.post('/api/diet/generate', requireAuth, async (req, res) => {
    try {
        const { duration, preferences } = req.body;
        const days = duration || 7;

        // Get user's nutrition goals
        const user = await User.findById(req.user.id);
        if (!user || !user.nutritionGoals || !user.nutritionGoals.targetCalories) {
            return res.status(400).json({ ok: false, message: 'Please calculate your nutrition needs first' });
        }

        const targetCal = user.nutritionGoals.targetCalories;
        const targetProtein = user.nutritionGoals.targetProtein;
        const targetCarbs = user.nutritionGoals.targetCarbs;
        const targetFats = user.nutritionGoals.targetFats;

        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + days - 1);

        const formatDate = (date) => date.toISOString().split('T')[0];

        // Get dishes from database
        let dishes = await Dish.find({});

        // If no dishes in DB, inform user to run seed script
        if (dishes.length === 0) {
            return res.status(400).json({ 
                ok: false, 
                message: 'No dishes available. Please run: npm run seed-dishes' 
            });
        }

        // Get user dietary preferences
        const currentUser = await User.findById(req.user.id);
        const dietaryPrefs = currentUser.dietaryPreferences || {};
        
        // Filter dishes based on dietary preferences (veg vs non-veg)
        const filteredDishes = dishes.filter(dish => {
            const userDietType = dietaryPrefs.dietaryType || 'vegetarian';
            
            // Vegetarian users: can only eat veg, vegan, eggetarian dishes
            if (userDietType === 'vegetarian') {
                return dish.dietaryType !== 'non-vegetarian';
            }
            
            // Non-vegetarian users: can eat everything
            return true;
        });
        
        // If no dishes match filters, use all dishes
        const usableDishes = filteredDishes.length > 0 ? filteredDishes : dishes;
        
        // Calculate daily target macros (distributed across meals)
        const dailyCalories = targetCal;
        const dailyProtein = targetProtein;
        const dailyCarbs = targetCarbs;
        const dailyFats = targetFats;
        
        // Meal distribution: Breakfast 20%, Lunch 35%, Dinner 30%, Snacks 15%
        const targetBreakfastCal = Math.round(dailyCalories * 0.20);
        const targetLunchCal = Math.round(dailyCalories * 0.35);
        const targetDinnerCal = Math.round(dailyCalories * 0.30);
        const targetSnackCal = Math.round(dailyCalories * 0.15);
        
        const targetBreakfastProtein = Math.round(dailyProtein * 0.25);
        const targetLunchProtein = Math.round(dailyProtein * 0.35);
        const targetDinnerProtein = Math.round(dailyProtein * 0.25);
        const targetSnackProtein = Math.round(dailyProtein * 0.15);
        
        // Helper function to select dish closest to target
        function selectDishForTarget(dishes, targetCal, targetProtein, maxAttempts = 20) {
            if (dishes.length === 0) return null;
            
            let bestMatch = dishes[0];
            let bestScore = Math.abs(dishes[0].calories - targetCal) + Math.abs(dishes[0].protein - targetProtein) * 2;
            
            // Try to find a good match
            for (let i = 0; i < Math.min(maxAttempts, dishes.length); i++) {
                const candidate = dishes[Math.floor(Math.random() * dishes.length)];
                const score = Math.abs(candidate.calories - targetCal) + Math.abs(candidate.protein - targetProtein) * 2;
                
                if (score < bestScore) {
                    bestScore = score;
                    bestMatch = candidate;
                }
                
                // If we found a very close match, use it
                if (score < 50) break;
            }
            
            return bestMatch;
        }
        
        // Generate diet plan
        const dailyPlans = [];
        
        for (let i = 0; i < days; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(currentDate.getDate() + i);
            
            // Select dishes for each meal type
            const breakfastDishes = usableDishes.filter(d => d.category === 'breakfast');
            const lunchDishes = usableDishes.filter(d => d.category === 'lunch');
            const dinnerDishes = usableDishes.filter(d => d.category === 'dinner');
            const snackDishes = usableDishes.filter(d => d.category === 'snack');

            // Select dishes that match targets
            const breakfast = selectDishForTarget(breakfastDishes, targetBreakfastCal, targetBreakfastProtein);
            const lunch = selectDishForTarget(lunchDishes, targetLunchCal, targetLunchProtein);
            const dinner = selectDishForTarget(dinnerDishes, targetDinnerCal, targetDinnerProtein);
            const snack = selectDishForTarget(snackDishes, targetSnackCal, targetSnackProtein);

            // Ensure we have valid dishes (fallback to random if needed)
            const selectedBreakfast = breakfast || breakfastDishes[Math.floor(Math.random() * breakfastDishes.length)];
            const selectedLunch = lunch || lunchDishes[Math.floor(Math.random() * lunchDishes.length)];
            const selectedDinner = dinner || dinnerDishes[Math.floor(Math.random() * dinnerDishes.length)];
            const selectedSnack = snack || snackDishes[Math.floor(Math.random() * snackDishes.length)];

            const dailyPlan = {
                date: formatDate(currentDate),
                breakfast: selectedBreakfast._id,
                lunch: selectedLunch._id,
                dinner: selectedDinner._id,
                snacks: [selectedSnack._id],
                totalCalories: selectedBreakfast.calories + selectedLunch.calories + selectedDinner.calories + selectedSnack.calories,
                totalProtein: selectedBreakfast.protein + selectedLunch.protein + selectedDinner.protein + selectedSnack.protein,
                totalCarbs: selectedBreakfast.carbs + selectedLunch.carbs + selectedDinner.carbs + selectedSnack.carbs,
                totalFats: selectedBreakfast.fats + selectedLunch.fats + selectedDinner.fats + selectedSnack.fats
            };

            dailyPlans.push(dailyPlan);
        }

        // Create and save diet plan
        const dietPlan = new DietPlan({
            userId: req.user.id,
            name: `My ${days}-Day Diet Plan`,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            targetCalories: targetCal,
            targetProtein: targetProtein,
            targetCarbs: targetCarbs,
            targetFats: targetFats,
            dailyPlans: dailyPlans,
            preferences: preferences || {}
        });

        await dietPlan.save();

        // Update user's current diet plan
        await User.findByIdAndUpdate(req.user.id, { currentDietPlan: dietPlan._id });

        // Populate diet plan with dish details for response
        const populatedPlan = await DietPlan.findById(dietPlan._id)
            .populate('dailyPlans.breakfast')
            .populate('dailyPlans.lunch')
            .populate('dailyPlans.dinner')
            .populate('dailyPlans.snacks');

        return res.json({ ok: true, dietPlan: populatedPlan });
    } catch (err) {
        console.error('Generate diet plan error:', err);
        return res.status(500).json({ ok: false, message: 'Internal server error.' });
    }
});

// Get user's current diet plan
app.get('/api/diet/current', requireAuth, async (req, res) => {
    try {
        const cacheKey = `diet:current:${req.user.id}`;

        // Try Redis cache first
        const cached = await cacheGet(cacheKey);
        if (cached) {
            return res.json({ ok: true, dietPlan: cached });
        }

        const user = await User.findById(req.user.id);
        if (!user.currentDietPlan) {
            return res.json({ ok: true, dietPlan: null });
        }

        const dietPlan = await DietPlan.findById(user.currentDietPlan)
            .populate('dailyPlans.breakfast')
            .populate('dailyPlans.lunch')
            .populate('dailyPlans.dinner')
            .populate('dailyPlans.snacks');

        // Cache the result
        await cacheSet(cacheKey, dietPlan, 300); // cache for 5 minutes

        return res.json({ ok: true, dietPlan });
    } catch (err) {
        console.error('Get current diet plan error:', err);
        return res.status(500).json({ ok: false, message: 'Internal server error.' });
    }
});

// Swap dish in diet plan
app.post('/api/diet/swap-dish', requireAuth, async (req, res) => {
    try {
        const { newDishId, oldDishId, mealType, dayIndex } = req.body;
        
        if (!newDishId || !oldDishId || !mealType || dayIndex === undefined) {
            return res.status(400).json({ ok: false, message: 'Missing required fields' });
        }
        
        // Get user's current diet plan
        const user = await User.findById(req.user.id);
        if (!user || !user.currentDietPlan) {
            return res.status(400).json({ ok: false, message: 'No active diet plan found' });
        }
        
        const dietPlan = await DietPlan.findById(user.currentDietPlan);
        if (!dietPlan) {
            return res.status(404).json({ ok: false, message: 'Diet plan not found' });
        }
        
        // Get the new dish
        const newDish = await Dish.findById(newDishId);
        if (!newDish) {
            return res.status(404).json({ ok: false, message: 'New dish not found' });
        }
        
        // Update the specific day's dish
        if (dayIndex < 0 || dayIndex >= dietPlan.dailyPlans.length) {
            return res.status(400).json({ ok: false, message: 'Invalid day index' });
        }
        
        const dailyPlan = dietPlan.dailyPlans[dayIndex];
        
        // Update the specific meal
        if (mealType === 'breakfast') {
            dailyPlan.breakfast = newDishId;
        } else if (mealType === 'lunch') {
            dailyPlan.lunch = newDishId;
        } else if (mealType === 'dinner') {
            dailyPlan.dinner = newDishId;
        } else if (mealType === 'snack') {
            // For snacks, we need to find which snack to replace
            if (Array.isArray(dailyPlan.snacks)) {
                const index = dailyPlan.snacks.findIndex(s => s.toString() === oldDishId);
                if (index !== -1) {
                    dailyPlan.snacks[index] = newDishId;
                }
            }
        }
        
        // Recalculate daily totals
        const currentDishes = await Dish.find({
            _id: { 
                $in: [
                    dailyPlan.breakfast, 
                    dailyPlan.lunch, 
                    dailyPlan.dinner, 
                    ...(Array.isArray(dailyPlan.snacks) ? dailyPlan.snacks : [])
                ] 
            }
        });
        
        let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFats = 0;
        
        for (const dish of currentDishes) {
            totalCal += dish.calories;
            totalProtein += dish.protein;
            totalCarbs += dish.carbs;
            totalFats += dish.fats;
        }
        
        dailyPlan.totalCalories = totalCal;
        dailyPlan.totalProtein = totalProtein;
        dailyPlan.totalCarbs = totalCarbs;
        dailyPlan.totalFats = totalFats;
        
        await dietPlan.save();
        
        // Fetch updated diet plan with populated dishes
        const updatedPlan = await DietPlan.findById(user.currentDietPlan)
            .populate('dailyPlans.breakfast')
            .populate('dailyPlans.lunch')
            .populate('dailyPlans.dinner')
            .populate('dailyPlans.snacks')
            .lean();
        
        return res.json({ ok: true, message: 'Dish updated successfully', dietPlan: updatedPlan });
    } catch (err) {
        console.error('Swap dish error:', err);
        return res.status(500).json({ ok: false, message: 'Internal server error.' });
    }
});

// Get all user's diet plans
app.get('/api/diet/plans', requireAuth, async (req, res) => {
    try {
        const cacheKey = `diet:plans:${req.user.id}`;

        const cached = await cacheGet(cacheKey);
        if (cached) {
            return res.json({ ok: true, plans: cached });
        }

        const plans = await DietPlan.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .lean();

        await cacheSet(cacheKey, plans, 300);

        return res.json({ ok: true, plans });
    } catch (err) {
        console.error('Get diet plans error:', err);
        return res.status(500).json({ ok: false, message: 'Internal server error.' });
    }
});

// Get single dish by ID for recipe details
app.get('/api/diet/dish/:dishId', requireAuth, async (req, res) => {
    try {
        const dishId = req.params.dishId;
        
        // Validate MongoDB ObjectId format (24 hex characters)
        if (!dishId || dishId.length !== 24) {
            console.log('Invalid dish ID format:', dishId);
            return res.status(400).json({ ok: false, message: 'Invalid dish ID format' });
        }
        
        const dish = await Dish.findById(dishId).lean();
        
        if (!dish) {
            console.log('Dish not found with ID:', dishId);
            return res.status(404).json({ ok: false, message: 'Dish not found' });
        }
        
        return res.json({ ok: true, dish });
    } catch (err) {
        console.error('Get dish error:', err);
        return res.status(500).json({ ok: false, message: 'Internal server error.' });
    }
});

// Get dishes by category for swapping
app.get('/api/diet/dishes/:category', requireAuth, async (req, res) => {
    try {
        const category = req.params.category;
        
        // Check if category is actually a dish ID (longer string)
        if (category.length >= 20) {
            // Likely a dish ID, fetch single dish
            const dish = await Dish.findById(category).lean();
            if (dish) {
                return res.json({ ok: true, dish });
            }
            return res.status(404).json({ ok: false, message: 'Dish not found' });
        }
        
        // Get user dietary preferences
        const user = await User.findById(req.user.id);
        const dietaryPrefs = user.dietaryPreferences || {};
        
        // Filter dishes based on dietary preferences
        let query = { category: category };
        
        // Add dietary type filter
        if (dietaryPrefs.dietaryType === 'vegetarian') {
            query.dietaryType = { $ne: 'non-vegetarian' };
        }
        
        const dishes = await Dish.find(query).lean();
        
        return res.json({ ok: true, dishes });
    } catch (err) {
        console.error('Get dishes error:', err);
        return res.status(500).json({ ok: false, message: 'Internal server error.' });
    }
});

// ===== TRAINING & WORKOUT API ROUTES =====

// Get user profile for training
app.get('/api/training/profile', requireAuth, async (req, res) => {
    try {
        const cacheKey = `training:profile:${req.user.id}`;
        
        const cached = await cacheGet(cacheKey);
        if (cached) {
            return res.json({ ok: true, profileData: cached });
        }

        const user = await User.findById(req.user.id).lean();
        if (!user) {
            return res.status(404).json({ ok: false, message: 'User not found' });
        }

        const profileData = {
            age: user.dateOfBirth ? new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear() : null,
            gender: user.gender,
            weight: user.currentWeight,
            height: user.height,
            activityLevel: user.activityLevel,
            fitnessLevel: user.fitnessLevel,
            primaryWorkoutGoal: user.primaryWorkoutGoal,
            goals: user.goals || [],
            workoutDuration: user.workoutDuration,
            workoutFrequency: user.workoutFrequency,
            preferredTime: user.preferredTime,
            cardio: user.cardio || [],
            strength: user.strength || [],
            flexibility: user.flexibility || []
        };

        await cacheSet(cacheKey, profileData, 300);
        return res.json({ ok: true, profileData });
    } catch (err) {
        console.error('Get training profile error:', err);
        return res.status(500).json({ ok: false, message: 'Internal server error.' });
    }
});

// Get exercises by category
app.get('/api/training/exercises/:category', requireAuth, async (req, res) => {
    try {
        const category = req.params.category;
        const cacheKey = `exercises:${category}`;

        const cached = await cacheGet(cacheKey);
        if (cached) {
            return res.json({ ok: true, exercises: cached });
        }

        // Build query - make isActive optional (defaults to true in schema)
        let query = {};
        
        // Only filter by category if it's not "all"
        if (category && category !== 'all') {
            query.category = category;
        }

        // Try to find exercises - check both with and without isActive filter
        let exercises = await Exercise.find(query).lean();
        
        // If no results and we filtered by isActive, try without the filter
        if (exercises.length === 0) {
            exercises = await Exercise.find(category && category !== 'all' ? { category } : {}).lean();
        }
        
        console.log(`Found ${exercises.length} exercises for category: ${category}`);
        
        await cacheSet(cacheKey, exercises, 600); // Cache for 10 minutes
        
        return res.json({ ok: true, exercises });
    } catch (err) {
        console.error('Get exercises error:', err);
        return res.status(500).json({ ok: false, message: 'Internal server error.', error: err.message });
    }
});

// Get single exercise by ID
app.get('/api/training/exercise/:exerciseId', requireAuth, async (req, res) => {
    try {
        const exerciseId = req.params.exerciseId;
        
        if (!exerciseId || exerciseId.length !== 24) {
            return res.status(400).json({ ok: false, message: 'Invalid exercise ID format' });
        }

        const cacheKey = `exercise:${exerciseId}`;
        const cached = await cacheGet(cacheKey);
        if (cached) {
            return res.json({ ok: true, exercise: cached });
        }
        
        const exercise = await Exercise.findById(exerciseId).lean();
        
        if (!exercise) {
            return res.status(404).json({ ok: false, message: 'Exercise not found' });
        }

        await cacheSet(cacheKey, exercise, 600);
        return res.json({ ok: true, exercise });
    } catch (err) {
        console.error('Get exercise error:', err);
        return res.status(500).json({ ok: false, message: 'Internal server error.' });
    }
});

// Generate workout plan
app.post('/api/training/generate', requireAuth, async (req, res) => {
    try {
        const { fitnessLevel, primaryGoal, duration, workoutsPerWeek } = req.body;
        const days = duration || 7;
        const workoutsPerWeekNum = workoutsPerWeek || 3;

        // Get user profile
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ ok: false, message: 'User not found' });
        }

        // Determine fitness level from user activity if not provided
        const level = fitnessLevel || (user.activityLevel === 'sedentary' || user.activityLevel === 'light' ? 'beginner' : 
                      user.activityLevel === 'moderate' ? 'intermediate' : 'advanced');
        
        // Determine goal from user goals if not provided
        const goal = primaryGoal || (user.goals && user.goals.length > 0 ? user.goals[0] : 'general-fitness');

        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + days - 1);

        const formatDate = (date) => date.toISOString().split('T')[0];

        // Get exercises based on goal and level
        let exerciseQuery = { isActive: true, difficulty: level };
        
        // Filter by goal
        if (goal === 'weight-loss') {
            exerciseQuery.category = { $in: ['cardio', 'hiit'] };
        } else if (goal === 'muscle-gain' || goal === 'strength') {
            exerciseQuery.category = { $in: ['strength'] };
        } else if (goal === 'flexibility') {
            exerciseQuery.category = { $in: ['flexibility', 'yoga', 'pilates'] };
        } else if (goal === 'endurance') {
            exerciseQuery.category = { $in: ['cardio', 'sports'] };
        }

        // Get user equipment preferences
        const userEquipment = user.strength || [];
        if (userEquipment.length > 0) {
            // Map user preferences to equipment types
            const equipmentMap = {
                'bodyweight': 'bodyweight',
                'free-weights': 'dumbbells',
                'machines': 'machine',
                'resistance-bands': 'resistance-bands'
            };
            const preferredEquipment = userEquipment.map(e => equipmentMap[e] || 'bodyweight');
            exerciseQuery.equipment = { $in: [...preferredEquipment, 'bodyweight', 'none'] };
        }

        const availableExercises = await Exercise.find(exerciseQuery).limit(50);

        if (availableExercises.length === 0) {
            return res.status(400).json({ 
                ok: false, 
                message: 'No exercises available. Please run: npm run seed-exercises' 
            });
        }

        // Generate daily workouts
        const dailyWorkouts = [];
        const workoutTypes = ['strength', 'cardio', 'flexibility', 'full-body', 'rest'];
        
        for (let i = 0; i < days; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(currentDate.getDate() + i);
            
            // Determine workout type based on day and goal
            let workoutType = 'rest';
            if (i % Math.ceil(days / workoutsPerWeekNum) === 0 && i < days) {
                if (goal === 'weight-loss') {
                    workoutType = i % 2 === 0 ? 'cardio' : 'hiit';
                } else if (goal === 'muscle-gain' || goal === 'strength') {
                    workoutType = 'strength';
                } else if (goal === 'flexibility') {
                    workoutType = 'flexibility';
                } else {
                    workoutType = 'full-body';
                }
            }

            if (workoutType === 'rest') {
                dailyWorkouts.push({
                    date: formatDate(currentDate),
                    workoutType: 'rest',
                    exercises: [],
                    totalDuration: 0,
                    estimatedCalories: 0,
                    completed: false
                });
                continue;
            }

            // Select exercises for this workout
            const exercisesForDay = [];
            const numExercises = level === 'beginner' ? 4 : level === 'intermediate' ? 5 : 6;
            
            for (let j = 0; j < numExercises && j < availableExercises.length; j++) {
                const exercise = availableExercises[Math.floor(Math.random() * availableExercises.length)];
                const sets = level === 'beginner' ? 2 : level === 'intermediate' ? 3 : 4;
                const reps = level === 'beginner' ? '8-10' : level === 'intermediate' ? '10-12' : '12-15';
                
                exercisesForDay.push({
                    exercise: exercise._id,
                    sets: sets,
                    reps: reps,
                    weight: 0,
                    duration: exercise.duration || 0,
                    restTime: 60
                });
            }

            const totalDuration = exercisesForDay.reduce((sum, ex) => sum + (ex.duration || 30), 0);
            const estimatedCalories = exercisesForDay.reduce((sum, ex) => {
                const exercise = availableExercises.find(e => e._id.toString() === ex.exercise.toString());
                return sum + ((exercise?.caloriesBurned || 5) * (ex.duration || 30));
            }, 0);

            dailyWorkouts.push({
                date: formatDate(currentDate),
                workoutType: workoutType,
                exercises: exercisesForDay,
                totalDuration: totalDuration,
                estimatedCalories: Math.round(estimatedCalories),
                completed: false
            });
        }

        // Create workout plan
        const workoutPlan = new WorkoutPlan({
            userId: req.user.id,
            name: `My ${days}-Day ${goal.charAt(0).toUpperCase() + goal.slice(1)} Plan`,
            fitnessLevel: level,
            primaryGoal: goal,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            duration: days,
            workoutsPerWeek: workoutsPerWeekNum,
            dailyWorkouts: dailyWorkouts,
            preferences: {
                equipment: user.strength || [],
                workoutDuration: user.workoutDuration || 45,
                preferredTime: user.preferredTime || 'morning'
            }
        });

        await workoutPlan.save();

        // Update user's current workout plan
        await User.findByIdAndUpdate(req.user.id, { currentWorkoutPlan: workoutPlan._id });

        // Clear related caches
        if (redisClient) {
            await redisClient.del(`workout:current:${req.user.id}`);
            await redisClient.del(`workout:plans:${req.user.id}`);
            // Also clear training profile cache since it might affect workout generation
            await redisClient.del(`training:profile:${req.user.id}`);
        }

        // Populate workout plan with exercise details
        const populatedPlan = await WorkoutPlan.findById(workoutPlan._id)
            .populate('dailyWorkouts.exercises.exercise')
            .lean();

        return res.json({ ok: true, workoutPlan: populatedPlan });
    } catch (err) {
        console.error('Generate workout plan error:', err);
        return res.status(500).json({ ok: false, message: 'Internal server error.' });
    }
});

// Get user's current workout plan
app.get('/api/training/current', requireAuth, async (req, res) => {
    try {
        const cacheKey = `workout:current:${req.user.id}`;

        const cached = await cacheGet(cacheKey);
        if (cached) {
            return res.json({ ok: true, workoutPlan: cached });
        }

        const user = await User.findById(req.user.id);
        if (!user.currentWorkoutPlan) {
            return res.json({ ok: true, workoutPlan: null });
        }

        const workoutPlan = await WorkoutPlan.findById(user.currentWorkoutPlan)
            .populate('dailyWorkouts.exercises.exercise')
            .lean();

        await cacheSet(cacheKey, workoutPlan, 300);

        return res.json({ ok: true, workoutPlan });
    } catch (err) {
        console.error('Get current workout plan error:', err);
        return res.status(500).json({ ok: false, message: 'Internal server error.' });
    }
});

// Get all user's workout plans
app.get('/api/training/plans', requireAuth, async (req, res) => {
    try {
        const cacheKey = `workout:plans:${req.user.id}`;

        const cached = await cacheGet(cacheKey);
        if (cached) {
            return res.json({ ok: true, plans: cached });
        }

        const plans = await WorkoutPlan.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .lean();

        await cacheSet(cacheKey, plans, 300);

        return res.json({ ok: true, plans });
    } catch (err) {
        console.error('Get workout plans error:', err);
        return res.status(500).json({ ok: false, message: 'Internal server error.' });
    }
});

// Mark workout as completed
app.post('/api/training/complete', requireAuth, async (req, res) => {
    try {
        const { workoutPlanId, dayIndex } = req.body;
        
        if (!workoutPlanId || dayIndex === undefined) {
            return res.status(400).json({ ok: false, message: 'Missing required fields' });
        }

        const workoutPlan = await WorkoutPlan.findById(workoutPlanId);
        if (!workoutPlan) {
            return res.status(404).json({ ok: false, message: 'Workout plan not found' });
        }

        if (dayIndex < 0 || dayIndex >= workoutPlan.dailyWorkouts.length) {
            return res.status(400).json({ ok: false, message: 'Invalid day index' });
        }

        const dailyWorkout = workoutPlan.dailyWorkouts[dayIndex];
        dailyWorkout.completed = true;
        dailyWorkout.completedAt = new Date();

        // Update progress
        workoutPlan.progress.totalWorkoutsCompleted += 1;
        workoutPlan.progress.totalCaloriesBurned += dailyWorkout.estimatedCalories || 0;
        workoutPlan.progress.currentStreak += 1;
        if (workoutPlan.progress.currentStreak > workoutPlan.progress.longestStreak) {
            workoutPlan.progress.longestStreak = workoutPlan.progress.currentStreak;
        }

        await workoutPlan.save();

        // Clear related caches
        if (redisClient) {
            await redisClient.del(`workout:current:${req.user.id}`);
            await redisClient.del(`workout:plans:${req.user.id}`);
            // Also clear training profile cache since progress affects stats
            await redisClient.del(`training:profile:${req.user.id}`);
        }

        const updatedPlan = await WorkoutPlan.findById(workoutPlanId)
            .populate('dailyWorkouts.exercises.exercise')
            .lean();

        return res.json({ ok: true, message: 'Workout marked as completed', workoutPlan: updatedPlan });
    } catch (err) {
        console.error('Complete workout error:', err);
        return res.status(500).json({ ok: false, message: 'Internal server error.' });
    }
});

// ===== RAZORPAY SETUP =====
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_RtkfimNOMnN1eL';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'vxjPyta3N8sfesfxpRGidNAT';

const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
});

// ===== PAYMENT API ROUTES =====

// Create Razorpay order
app.post('/api/payment/create-order', requireAuth, async (req, res) => {
    try {
        const { planType, billingCycle } = req.body;
        
        if (!planType || !billingCycle) {
            return res.status(400).json({ ok: false, message: 'Plan type and billing cycle are required' });
        }

        // Plan pricing (in paise - Razorpay uses smallest currency unit)
        const planPrices = {
            'basic': { monthly: 29900, yearly: 23900 },
            'pro': { monthly: 59900, yearly: 47900 },
            'premium': { monthly: 99900, yearly: 79900 }
        };

        const amount = planPrices[planType]?.[billingCycle];
        if (!amount) {
            return res.status(400).json({ ok: false, message: 'Invalid plan or billing cycle' });
        }

        // Generate a short receipt ID (max 40 chars for Razorpay)
        // Format: RCP + timestamp (last 10 digits) + user ID (first 8 chars) = 21 chars
        const timestamp = Date.now().toString().slice(-10);
        const userIdShort = req.user.id.toString().slice(-8);
        const receipt = `RCP${timestamp}${userIdShort}`;

        const options = {
            amount: amount, // Amount in paise
            currency: 'INR',
            receipt: receipt,
            notes: {
                userId: req.user.id.toString(),
                planType: planType,
                billingCycle: billingCycle,
                username: req.user.username
            }
        };

        const order = await razorpay.orders.create(options);

        // Update user with order ID (temporary, will be finalized on payment success)
        await User.findByIdAndUpdate(req.user.id, {
            'subscription.razorpayOrderId': order.id
        });

        return res.json({
            ok: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: RAZORPAY_KEY_ID
        });
    } catch (err) {
        console.error('Create order error:', err);
        return res.status(500).json({ ok: false, message: 'Failed to create order. Please try again.' });
    }
});

// Verify payment and update subscription
app.post('/api/payment/verify', requireAuth, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ ok: false, message: 'Payment verification data missing' });
        }

        // Verify signature
        const crypto = require('crypto');
        const generated_signature = crypto
            .createHmac('sha256', RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ ok: false, message: 'Invalid payment signature' });
        }

        // Get order details from Razorpay
        const order = await razorpay.orders.fetch(razorpay_order_id);
        
        // Extract plan info from order notes
        const planType = order.notes?.planType || 'basic';
        const billingCycle = order.notes?.billingCycle || 'monthly';

        // Calculate subscription end date
        const startDate = new Date();
        const endDate = new Date();
        if (billingCycle === 'yearly') {
            endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
            endDate.setMonth(endDate.getMonth() + 1);
        }

        // Update user subscription
        const user = await User.findByIdAndUpdate(
            req.user.id,
            {
                'subscription.plan': planType,
                'subscription.billingCycle': billingCycle,
                'subscription.status': 'active',
                'subscription.startDate': startDate,
                'subscription.endDate': endDate,
                'subscription.razorpayOrderId': razorpay_order_id,
                'subscription.razorpayPaymentId': razorpay_payment_id,
                'subscription.razorpaySignature': razorpay_signature
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ ok: false, message: 'User not found' });
        }

        // Clear profile cache
        await cacheDel(`profile:${req.user.id}`);

        return res.json({
            ok: true,
            message: 'Payment verified and subscription activated',
            subscription: user.subscription
        });
    } catch (err) {
        console.error('Payment verification error:', err);
        return res.status(500).json({ ok: false, message: 'Payment verification failed. Please contact support.' });
    }
});

// Get current subscription status
app.get('/api/payment/subscription', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).lean();
        if (!user) {
            return res.status(404).json({ ok: false, message: 'User not found' });
        }

        // Check if subscription is expired
        let subscription = user.subscription || {};
        if (subscription.endDate && new Date(subscription.endDate) < new Date() && subscription.status === 'active') {
            subscription.status = 'expired';
            // Update in database
            await User.findByIdAndUpdate(req.user.id, { 'subscription.status': 'expired' });
        }

        return res.json({
            ok: true,
            subscription: subscription
        });
    } catch (err) {
        console.error('Get subscription error:', err);
        return res.status(500).json({ ok: false, message: 'Failed to get subscription status' });
    }
});

// ===== SSL/HTTPS SETUP =====
const certDir = path.join(__dirname, 'ssl');
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

const useHTTPS = process.env.USE_HTTPS !== 'false' && fs.existsSync(keyPath) && fs.existsSync(certPath);

if (useHTTPS) {
    const options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };
    
    const httpsServer = https.createServer(options, app);
    httpsServer.listen(PORT, () => {
        console.log(`✅ Server running at https://localhost:${PORT}`);
        console.log('⚠️  Using self-signed certificate. Browser will show security warning.');
        console.log('   Click "Advanced" → "Proceed to localhost" to continue.');
    });
} else {
    // Fallback to HTTP if certificates not found or HTTPS disabled
    app.listen(PORT, () => {
        if (process.env.USE_HTTPS === 'false') {
            console.log(`Server running at http://localhost:${PORT} (HTTPS disabled)`);
        } else {
            console.log(`Server running at http://localhost:${PORT}`);
            console.log('⚠️  HTTPS not enabled. Run "npm run generate-cert" to generate SSL certificates.');
        }
    });
}
