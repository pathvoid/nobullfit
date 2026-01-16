-- NoBullFit Database Schema

-- Users table - stores user account information
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    terms_accepted BOOLEAN NOT NULL DEFAULT false,
    terms_accepted_at TIMESTAMP,
    plan VARCHAR(10) CHECK (plan IN ('free', 'pro')),
    plan_selected_at TIMESTAMP,
    subscribed BOOLEAN NOT NULL DEFAULT false,
    subscribed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for faster lookups by created_at
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Password resets table - stores password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);

-- Password reset rate limiting table - prevents spam/abuse
CREATE TABLE IF NOT EXISTS password_reset_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    first_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by email
CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_email ON password_reset_attempts(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_last_attempt ON password_reset_attempts(last_attempt_at);

-- Email change requests table - stores pending email change requests
CREATE TABLE IF NOT EXISTS email_change_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    new_email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_email_change_requests_token ON email_change_requests(token);
CREATE INDEX IF NOT EXISTS idx_email_change_requests_user_id ON email_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_email_change_requests_expires_at ON email_change_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_change_requests_new_email ON email_change_requests(new_email);

-- Favorites table - stores user's favorite food items and recipes
CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    food_id VARCHAR(255) NOT NULL,
    food_label VARCHAR(500) NOT NULL,
    food_data JSONB,
    item_type VARCHAR(50) NOT NULL DEFAULT 'food',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, food_id, item_type)
);

-- Index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_food_id ON favorites(food_id);
CREATE INDEX IF NOT EXISTS idx_favorites_item_type ON favorites(item_type);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at);

-- Grocery lists table - stores user's grocery lists
CREATE TABLE IF NOT EXISTS grocery_lists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_grocery_lists_user_id ON grocery_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_grocery_lists_created_at ON grocery_lists(created_at);

-- Grocery list items table - stores items in grocery lists
CREATE TABLE IF NOT EXISTS grocery_list_items (
    id SERIAL PRIMARY KEY,
    list_id INTEGER NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
    food_id VARCHAR(255) NOT NULL,
    food_label VARCHAR(500) NOT NULL,
    food_data JSONB,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(list_id, food_id)
);

-- Index for faster lookups by list_id
CREATE INDEX IF NOT EXISTS idx_grocery_list_items_list_id ON grocery_list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_grocery_list_items_food_id ON grocery_list_items(food_id);
CREATE INDEX IF NOT EXISTS idx_grocery_list_items_created_at ON grocery_list_items(created_at);

-- Recipes table - stores user-created recipes
CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    ingredients JSONB NOT NULL DEFAULT '[]',
    steps JSONB NOT NULL DEFAULT '[]',
    image_filename VARCHAR(255),
    macros JSONB,
    servings INTEGER,
    cooking_time_minutes INTEGER,
    tags JSONB DEFAULT '[]',
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    last_verified_at TIMESTAMP,
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON recipes(is_public);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at);
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name);
CREATE INDEX IF NOT EXISTS idx_recipes_is_flagged ON recipes(is_flagged);
CREATE INDEX IF NOT EXISTS idx_recipes_last_verified_at ON recipes(last_verified_at);

-- Food tracking table - stores user's logged food items
CREATE TABLE IF NOT EXISTS food_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL DEFAULT 'food',
    food_id VARCHAR(255) NOT NULL,
    food_label VARCHAR(500) NOT NULL,
    food_data JSONB NOT NULL,
    recipe_data JSONB,
    quantity DECIMAL(10, 4) NOT NULL,
    measure_uri VARCHAR(255),
    measure_label VARCHAR(100),
    category VARCHAR(50) NOT NULL DEFAULT 'Breakfast',
    date DATE NOT NULL,
    timezone VARCHAR(100) NOT NULL,
    -- All nutritional macros stored as JSONB for flexibility
    nutrients JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_food_tracking_user_id ON food_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_food_tracking_date ON food_tracking(date);
CREATE INDEX IF NOT EXISTS idx_food_tracking_category ON food_tracking(category);
CREATE INDEX IF NOT EXISTS idx_food_tracking_item_type ON food_tracking(item_type);
CREATE INDEX IF NOT EXISTS idx_food_tracking_user_date ON food_tracking(user_id, date);

-- Progress tracking table - stores user's logged activities/exercises
CREATE TABLE IF NOT EXISTS progress_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    activity_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    timezone VARCHAR(100) NOT NULL,
    -- Activity-specific data stored as JSONB for flexibility
    activity_data JSONB NOT NULL,
    calories_burned DECIMAL(10, 2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_progress_tracking_user_id ON progress_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_date ON progress_tracking(date);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_activity_type ON progress_tracking(activity_type);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_user_date ON progress_tracking(user_id, date);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_activity_name ON progress_tracking(activity_name);

-- Weight tracking table - stores user's weight entries
CREATE TABLE IF NOT EXISTS weight_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(10) NOT NULL DEFAULT 'kg',
    date DATE NOT NULL,
    timezone VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_weight_tracking_user_id ON weight_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_tracking_date ON weight_tracking(date);
CREATE INDEX IF NOT EXISTS idx_weight_tracking_user_date ON weight_tracking(user_id, date);

-- TDEE (Total Daily Energy Expenditure) table - stores user's TDEE calculation data
CREATE TABLE IF NOT EXISTS user_tdee (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    age INTEGER NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
    height_cm DECIMAL(10, 2) NOT NULL,
    activity_level VARCHAR(20) NOT NULL CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active')),
    bmr DECIMAL(10, 2) NOT NULL,
    tdee DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_tdee_user_id ON user_tdee(user_id);

-- Maintenance schedules table - stores scheduled maintenance windows
CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id SERIAL PRIMARY KEY,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_start_time ON maintenance_schedules(start_time);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_end_time ON maintenance_schedules(end_time);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_is_active ON maintenance_schedules(is_active);

-- User settings table - stores user preferences
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quick_add_days INTEGER NOT NULL DEFAULT 30,
    weight_goal VARCHAR(10) CHECK (weight_goal IN ('lose', 'maintain', 'gain')),
    target_weight DECIMAL(10, 2),
    target_weight_unit VARCHAR(3) CHECK (target_weight_unit IN ('kg', 'lbs')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

