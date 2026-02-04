import express, { Router } from "express";
import { handleSignUp } from "./api/handlers/signUpHandler.js";
import { handleSignIn } from "./api/handlers/signInHandler.js";
import { handleGetMe, handleLogout } from "./api/handlers/authHandler.js";
import { handleSelectPlan } from "./api/handlers/planHandler.js";
import { handleForgotPassword } from "./api/handlers/forgotPasswordHandler.js";
import { handleResetPassword } from "./api/handlers/resetPasswordHandler.js";
import { handleChangeEmailRequest, handleConfirmEmailChange } from "./api/handlers/changeEmailHandler.js";
import { handleChangePassword } from "./api/handlers/changePasswordHandler.js";
import { handleDeleteAccount } from "./api/handlers/deleteAccountHandler.js";
import { handleExportData } from "./api/handlers/exportDataHandler.js";
import { handleDeleteData } from "./api/handlers/deleteDataHandler.js";
import { handleFoodDatabaseSearch } from "./api/handlers/foodDatabaseHandler.js";
import { handleFoodDetails } from "./api/handlers/foodDetailsHandler.js";
import { handleGetFavorites, handleAddFavorite, handleRemoveFavorite, handleCheckFavorite } from "./api/handlers/favoritesHandler.js";
import {
    handleGetGroceryLists,
    handleCreateGroceryList,
    handleUpdateGroceryList,
    handleDeleteGroceryList,
    handleGetGroceryListItems,
    handleAddGroceryListItems,
    handleRemoveGroceryListItem,
    handleBulkRemoveGroceryListItems,
    handleUpdateGroceryListItemQuantity,
    handleSendGroceryListEmail,
    handleAddRecipeIngredientsToGroceryList
} from "./api/handlers/groceryListsHandler.js";
import {
    handleGetRecipes,
    handleGetRecipe,
    handleCreateRecipe,
    handleUpdateRecipe,
    handleDeleteRecipe
} from "./api/handlers/recipesHandler.js";
import { uploadRecipeImageHandler } from "./api/handlers/recipeImageUploadHandler.js";
import {
    handleGetFoodTracking,
    handleLogFood,
    handleUpdateFoodTracking,
    handleDeleteFoodTracking,
    handleGetRecentFoods,
    handleCopyDay,
    handleCopyWeek
} from "./api/handlers/foodTrackingHandler.js";
import {
    handleGetProgressTracking,
    handleGetRecentActivities,
    handleLogActivity,
    handleUpdateProgressTracking,
    handleDeleteProgressTracking,
    handleCopyProgressDay,
    handleCopyProgressWeek
} from "./api/handlers/progressTrackingHandler.js";
import {
    handleGetWeight,
    handleGetLastWeightUnit,
    handleLogWeight,
    handleDeleteWeight
} from "./api/handlers/weightTrackingHandler.js";
import {
    handleGetLatestWeight,
    handleGetTDEE,
    handleSaveTDEE
} from "./api/handlers/tdeeHandler.js";
import { handleGetDashboardStats } from "./api/handlers/dashboardHandler.js";
import { handleGenerateDashboardReport } from "./api/handlers/reportsHandler.js";
import { handleGetMaintenanceStatus } from "./api/handlers/maintenanceHandler.js";
import { handleGetUserPreferences, handleUpdateUserPreferences } from "./api/handlers/userPreferencesHandler.js";
import { handleGetGoalInsights } from "./api/handlers/goalInsightsHandler.js";
import { handleGetSubscription, handleCreatePortalSession, handleInitCheckout, handleSyncSubscription, handleGetPaddleConfig } from "./api/handlers/billingHandler.js";
import { handlePaddleWebhook } from "./api/handlers/paddleWebhookHandler.js";
import { handleGetFeatureFlags, handleGetEnabledFlags, handleGetIntegrationFlags, handleGetEnabledIntegrations } from "./api/handlers/featureFlagsHandler.js";
import { handleGetIntegrations, handleGetIntegration, handleConnectIntegration, handleOAuthCallback, handleDisconnectIntegration } from "./api/handlers/integrationsHandler.js";
import { handleTriggerSync, handleGetSyncHistory } from "./api/handlers/integrationSyncHandler.js";
import { handleWebhookValidation, handleWebhookEvent, handleCreateSubscription, handleViewSubscription, handleDeleteSubscription } from "./api/handlers/stravaWebhookHandler.js";

// API router class - handles all /api routes
class App {
    public router: Router = express.Router();

    constructor() {
        // Example API endpoint
        this.router.get("/", (req, res) => {
            res.send("Welcome to the API!");
        });

        // Authentication endpoints
        this.router.post("/sign-up", handleSignUp);
        this.router.post("/sign-in", handleSignIn);
        this.router.get("/auth/me", handleGetMe);
        this.router.post("/auth/logout", handleLogout);
        this.router.post("/auth/select-plan", handleSelectPlan);
        this.router.post("/forgot-password", handleForgotPassword);
        this.router.post("/reset-password", handleResetPassword);
        
        // Settings endpoints
        this.router.post("/settings/change-email", handleChangeEmailRequest);
        this.router.post("/settings/confirm-email-change", handleConfirmEmailChange);
        this.router.post("/settings/change-password", handleChangePassword);
        this.router.get("/settings/export-data", handleExportData);
        this.router.post("/settings/delete-data", handleDeleteData);
        this.router.post("/settings/delete-account", handleDeleteAccount);
        this.router.get("/settings/preferences", handleGetUserPreferences);
        this.router.put("/settings/preferences", handleUpdateUserPreferences);
        
        // Food database endpoints
        this.router.get("/food-database/search", handleFoodDatabaseSearch);
        this.router.get("/food-database/details/:foodId", handleFoodDetails);
        
        // Favorites endpoints
        this.router.get("/favorites", handleGetFavorites);
        this.router.post("/favorites", handleAddFavorite);
        this.router.delete("/favorites/:foodId", handleRemoveFavorite);
        this.router.get("/favorites/check/:foodId", handleCheckFavorite);
        
        // Grocery lists endpoints
        this.router.get("/grocery-lists", handleGetGroceryLists);
        this.router.post("/grocery-lists", handleCreateGroceryList);
        this.router.put("/grocery-lists/:listId", handleUpdateGroceryList);
        this.router.delete("/grocery-lists/:listId", handleDeleteGroceryList);
        this.router.get("/grocery-lists/:listId/items", handleGetGroceryListItems);
        this.router.post("/grocery-lists/:listId/items", handleAddGroceryListItems);
        this.router.post("/grocery-lists/:listId/add-recipe", handleAddRecipeIngredientsToGroceryList);
        this.router.put("/grocery-lists/:listId/items/:itemId/quantity", handleUpdateGroceryListItemQuantity);
        this.router.post("/grocery-lists/:listId/send-email", handleSendGroceryListEmail);
        this.router.delete("/grocery-lists/:listId/items/:itemId", handleRemoveGroceryListItem);
        this.router.delete("/grocery-lists/:listId/items", handleBulkRemoveGroceryListItems);
        
        // Recipe endpoints
        this.router.get("/recipes", handleGetRecipes);
        this.router.get("/recipes/:recipeId", handleGetRecipe);
        this.router.post("/recipes", handleCreateRecipe);
        this.router.put("/recipes/:recipeId", handleUpdateRecipe);
        this.router.delete("/recipes/:recipeId", handleDeleteRecipe);
        this.router.post("/recipes/upload-image", uploadRecipeImageHandler);
        
        // Food tracking endpoints
        this.router.get("/food-tracking", handleGetFoodTracking);
        this.router.post("/food-tracking", handleLogFood);
        this.router.put("/food-tracking/:id", handleUpdateFoodTracking);
        this.router.delete("/food-tracking/:id", handleDeleteFoodTracking);
        this.router.get("/food-tracking/recent", handleGetRecentFoods);
        this.router.post("/food-tracking/copy-day", handleCopyDay);
        this.router.post("/food-tracking/copy-week", handleCopyWeek);
        
        // Progress tracking endpoints
        this.router.get("/progress-tracking", handleGetProgressTracking);
        this.router.get("/progress-tracking/recent", handleGetRecentActivities);
        this.router.post("/progress-tracking", handleLogActivity);
        this.router.put("/progress-tracking/:id", handleUpdateProgressTracking);
        this.router.delete("/progress-tracking/:id", handleDeleteProgressTracking);
        this.router.post("/progress-tracking/copy-day", handleCopyProgressDay);
        this.router.post("/progress-tracking/copy-week", handleCopyProgressWeek);
        
        // Weight tracking endpoints
        this.router.get("/weight-tracking", handleGetWeight);
        this.router.get("/weight-tracking/last-unit", handleGetLastWeightUnit);
        this.router.post("/weight-tracking", handleLogWeight);
        this.router.delete("/weight-tracking/:id", handleDeleteWeight);
        
        // TDEE endpoints
        this.router.get("/tdee/latest-weight", handleGetLatestWeight);
        this.router.get("/tdee", handleGetTDEE);
        this.router.post("/tdee", handleSaveTDEE);
        
        // Dashboard stats
        this.router.get("/dashboard/stats", handleGetDashboardStats);
        this.router.get("/dashboard/goal-insights", handleGetGoalInsights);
        
        // Reports
        this.router.post("/reports/dashboard", handleGenerateDashboardReport);
        
        // Maintenance status (public endpoint)
        this.router.get("/maintenance/status", handleGetMaintenanceStatus);
        
        // Billing endpoints
        this.router.get("/billing/subscription", handleGetSubscription);
        this.router.get("/billing/paddle-config", handleGetPaddleConfig);
        this.router.post("/billing/portal", handleCreatePortalSession);
        this.router.post("/billing/checkout", handleInitCheckout);
        this.router.post("/billing/sync", handleSyncSubscription);
        
        // Paddle webhook endpoint (signature verification happens in handler)
        this.router.post("/paddle/webhook", handlePaddleWebhook);

        // Feature flags endpoints (public, cached)
        this.router.get("/feature-flags", handleGetFeatureFlags);
        this.router.get("/feature-flags/enabled", handleGetEnabledFlags);
        this.router.get("/feature-flags/integrations", handleGetIntegrationFlags);
        this.router.get("/feature-flags/integrations/enabled", handleGetEnabledIntegrations);

        // Health & Fitness integrations endpoints
        this.router.get("/integrations", handleGetIntegrations);
        this.router.get("/integrations/:provider", handleGetIntegration);
        this.router.post("/integrations/:provider/connect", handleConnectIntegration);
        this.router.get("/integrations/oauth/callback/:provider", handleOAuthCallback);
        this.router.delete("/integrations/:provider", handleDisconnectIntegration);

        // Integration sync endpoints
        this.router.post("/integrations/:provider/sync", handleTriggerSync);
        this.router.get("/integrations/:provider/sync-history", handleGetSyncHistory);

        // Strava webhook endpoints (public - Strava needs to reach these)
        this.router.get("/webhooks/strava", handleWebhookValidation);
        this.router.post("/webhooks/strava", handleWebhookEvent);

        // Strava webhook subscription management (admin endpoints)
        this.router.post("/admin/webhooks/strava/subscription", handleCreateSubscription);
        this.router.get("/admin/webhooks/strava/subscription", handleViewSubscription);
        this.router.delete("/admin/webhooks/strava/subscription", handleDeleteSubscription);
        this.router.delete("/admin/webhooks/strava/subscription/:id", handleDeleteSubscription);
    }
}

const api = new App();

export default api;