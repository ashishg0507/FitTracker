const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Models
const User = require('./models/User');
const Dish = require('./models/Dish');
const DietPlan = require('./models/DietPlan');

const app = express();
const PORT = process.env.PORT || 3000;

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
        const user = await User.findById(req.user.id).lean();
        if (!user) {
            return res.status(404).json({ ok: false, message: 'User not found' });
        }
        const { passwordHash, __v, ...safeUser } = user;
        return res.json({ ok: true, user: safeUser });
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
            'workoutDuration','workoutFrequency','preferredTime','cardio','strength',
            'flexibility','notifications','email','dietaryPreferences'
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

app.get('/training', (req, res) => {
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
        const user = await User.findById(req.user.id);
        if (!user.currentDietPlan) {
            return res.json({ ok: true, dietPlan: null });
        }

        const dietPlan = await DietPlan.findById(user.currentDietPlan)
            .populate('dailyPlans.breakfast')
            .populate('dailyPlans.lunch')
            .populate('dailyPlans.dinner')
            .populate('dailyPlans.snacks');

        return res.json({ ok: true, dietPlan });
    } catch (err) {
        console.error('Get current diet plan error:', err);
        return res.status(500).json({ ok: false, message: 'Internal server error.' });
    }
});
