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
    paddle_customer_id VARCHAR(50),
    paddle_subscription_id VARCHAR(50),
    subscription_status VARCHAR(20) CHECK (subscription_status IN ('active', 'paused', 'past_due', 'canceled', 'trialing')),
    subscription_ends_at TIMESTAMP,
    subscription_canceled_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for faster lookups by created_at
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Index for faster lookups by Paddle customer and subscription IDs
CREATE INDEX IF NOT EXISTS idx_users_paddle_customer_id ON users(paddle_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_paddle_subscription_id ON users(paddle_subscription_id);

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
    -- Strava integration: track imported activities to prevent duplicates
    strava_activity_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_progress_tracking_user_id ON progress_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_date ON progress_tracking(date);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_activity_type ON progress_tracking(activity_type);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_user_date ON progress_tracking(user_id, date);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_activity_name ON progress_tracking(activity_name);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_strava ON progress_tracking(strava_activity_id) WHERE strava_activity_id IS NOT NULL;

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
    communication_email BOOLEAN NOT NULL DEFAULT true,
    communication_sms BOOLEAN NOT NULL DEFAULT false,
    communication_push BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Feature flags table - global system-wide feature toggles
CREATE TABLE IF NOT EXISTS feature_flags (
    id SERIAL PRIMARY KEY,
    flag_key VARCHAR(100) UNIQUE NOT NULL,
    flag_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by flag_key
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(is_enabled);

-- Initial feature flags for integrations (run separately after table creation)
-- INSERT INTO feature_flags (flag_key, flag_name, description, is_enabled) VALUES
--     ('integration_apple_health', 'Apple Health Integration', 'Enable Apple Health data import', true),
--     ('integration_google_fit', 'Google Fit Integration', 'Enable Google Fit data import', true),
--     ('integration_samsung_health', 'Samsung Health Integration', 'Enable Samsung Health data import', true),
--     ('integration_strava', 'Strava Integration', 'Enable Strava workout imports', true),
--     ('integration_garmin', 'Garmin Integration', 'Enable Garmin workout imports', true),
--     ('integration_fitbit', 'Fitbit Integration', 'Enable Fitbit data import', true),
--     ('integration_withings', 'Withings Integration', 'Enable Withings smart scale data', true)
-- ON CONFLICT (flag_key) DO NOTHING;

-- Integration connections table - stores OAuth connections to health/fitness providers
CREATE TABLE IF NOT EXISTS integration_connections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP,
    provider_user_id VARCHAR(255),
    scopes JSONB DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disconnected', 'expired', 'error')),
    last_error TEXT,
    last_sync_at TIMESTAMP,
    last_successful_sync_at TIMESTAMP,
    connected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider)
);

-- Indexes for integration connections
CREATE INDEX IF NOT EXISTS idx_integration_connections_user_id ON integration_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_connections_provider ON integration_connections(provider);
CREATE INDEX IF NOT EXISTS idx_integration_connections_status ON integration_connections(status);
CREATE INDEX IF NOT EXISTS idx_integration_connections_user_provider ON integration_connections(user_id, provider);

-- Auto-sync settings table - stores auto-sync configuration for Pro users
CREATE TABLE IF NOT EXISTS integration_auto_sync (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    sync_frequency_minutes INTEGER NOT NULL DEFAULT 60,
    sync_data_types JSONB DEFAULT '["calories_burned", "workouts", "weight"]',
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    last_failure_at TIMESTAMP,
    last_failure_reason TEXT,
    disabled_due_to_failure BOOLEAN NOT NULL DEFAULT false,
    failure_notification_sent BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider)
);

-- Indexes for auto-sync settings
CREATE INDEX IF NOT EXISTS idx_integration_auto_sync_user ON integration_auto_sync(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_auto_sync_enabled ON integration_auto_sync(is_enabled);
CREATE INDEX IF NOT EXISTS idx_integration_auto_sync_provider ON integration_auto_sync(provider);

-- Integration sync history table - stores sync operation history for auditing
CREATE TABLE IF NOT EXISTS integration_sync_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN ('manual', 'auto')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
    records_imported INTEGER DEFAULT 0,
    data_types_synced JSONB DEFAULT '[]',
    error_message TEXT,
    error_code VARCHAR(50),
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for sync history
CREATE INDEX IF NOT EXISTS idx_integration_sync_history_user ON integration_sync_history(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_history_provider ON integration_sync_history(provider);
CREATE INDEX IF NOT EXISTS idx_integration_sync_history_created ON integration_sync_history(created_at);
CREATE INDEX IF NOT EXISTS idx_integration_sync_history_user_provider ON integration_sync_history(user_id, provider);

-- Strava webhook events queue table - stores incoming webhook events for async processing
CREATE TABLE IF NOT EXISTS strava_webhook_events (
    id SERIAL PRIMARY KEY,
    object_type VARCHAR(20) NOT NULL,
    object_id BIGINT NOT NULL,
    aspect_type VARCHAR(20) NOT NULL,
    owner_id BIGINT NOT NULL,
    subscription_id INTEGER NOT NULL,
    event_time TIMESTAMP NOT NULL,
    updates JSONB,
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for webhook events
CREATE INDEX IF NOT EXISTS idx_strava_webhook_events_processed ON strava_webhook_events(processed, created_at);
CREATE INDEX IF NOT EXISTS idx_strava_webhook_events_owner ON strava_webhook_events(owner_id);
CREATE INDEX IF NOT EXISTS idx_strava_webhook_events_object ON strava_webhook_events(object_type, object_id);

