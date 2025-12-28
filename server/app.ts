import express, { Router } from "express";
import { handleSignUp } from "./api/handlers/signUpHandler.js";
import { handleSignIn } from "./api/handlers/signInHandler.js";
import { handleGetMe, handleLogout } from "./api/handlers/authHandler.js";
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
    handleGetRecentFoods
} from "./api/handlers/foodTrackingHandler.js";
import {
    handleGetProgressTracking,
    handleGetRecentActivities,
    handleLogActivity,
    handleUpdateProgressTracking,
    handleDeleteProgressTracking
} from "./api/handlers/progressTrackingHandler.js";
import {
    handleGetWeight,
    handleGetLastWeightUnit,
    handleLogWeight,
    handleDeleteWeight
} from "./api/handlers/weightTrackingHandler.js";
import { handleGetDashboardStats } from "./api/handlers/dashboardHandler.js";

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
        this.router.post("/forgot-password", handleForgotPassword);
        this.router.post("/reset-password", handleResetPassword);
        
        // Settings endpoints
        this.router.post("/settings/change-email", handleChangeEmailRequest);
        this.router.post("/settings/confirm-email-change", handleConfirmEmailChange);
        this.router.post("/settings/change-password", handleChangePassword);
        this.router.get("/settings/export-data", handleExportData);
        this.router.post("/settings/delete-data", handleDeleteData);
        this.router.post("/settings/delete-account", handleDeleteAccount);
        
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
        
        // Progress tracking endpoints
        this.router.get("/progress-tracking", handleGetProgressTracking);
        this.router.get("/progress-tracking/recent", handleGetRecentActivities);
        this.router.post("/progress-tracking", handleLogActivity);
        this.router.put("/progress-tracking/:id", handleUpdateProgressTracking);
        this.router.delete("/progress-tracking/:id", handleDeleteProgressTracking);
        
        // Weight tracking endpoints
        this.router.get("/weight-tracking", handleGetWeight);
        this.router.get("/weight-tracking/last-unit", handleGetLastWeightUnit);
        this.router.post("/weight-tracking", handleLogWeight);
        this.router.delete("/weight-tracking/:id", handleDeleteWeight);
        
        // Dashboard stats
        this.router.get("/dashboard/stats", handleGetDashboardStats);
    }
}

const api = new App();

export default api;