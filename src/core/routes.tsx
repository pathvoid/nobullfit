import type { RouteObject } from "react-router-dom";
import loadable from "@loadable/component";

import Layout from "@core/components/Layout/Layout";
import Home from "@screens/Home/Home";
import homeLoader from "@loaders/homeLoader";
import About from "@screens/About/About";
import aboutLoader from "@loaders/aboutLoader";
import contactLoader from "@loaders/contactLoader";
import RefundPolicy from "@screens/RefundPolicy/RefundPolicy";
import refundPolicyLoader from "@loaders/refundPolicyLoader";
import TermsOfService from "@screens/TermsOfService/TermsOfService";
import termsOfServiceLoader from "@loaders/termsOfServiceLoader";
import PrivacyPolicy from "@screens/PrivacyPolicy/PrivacyPolicy";
import privacyPolicyLoader from "@loaders/privacyPolicyLoader";
import SignIn from "@screens/SignIn/SignIn";
import signInLoader from "@loaders/signInLoader";
import SignUp from "@screens/SignUp/SignUp";
import signUpLoader from "@loaders/signUpLoader";
import ForgotPassword from "@screens/ForgotPassword/ForgotPassword";
import forgotPasswordLoader from "@loaders/forgotPasswordLoader";
import ResetPassword from "@screens/ResetPassword/ResetPassword";
import resetPasswordLoader from "@loaders/resetPasswordLoader";
import ConfirmEmailChange from "@screens/ConfirmEmailChange/ConfirmEmailChange";
import confirmEmailChangeLoader from "@loaders/confirmEmailChangeLoader";
import Dashboard from "@screens/Dashboard/Dashboard";
import dashboardLoader from "@loaders/dashboardLoader";
import Favorites from "@screens/Dashboard/Favorites/Favorites";
import favoritesLoader from "@loaders/favoritesLoader";
import FoodDatabase from "@screens/Dashboard/FoodDatabase/FoodDatabase";
import foodDatabaseLoader from "@loaders/foodDatabaseLoader";
import FoodDetails from "@screens/Dashboard/FoodDatabase/FoodDetails";
import foodDetailsLoader from "@loaders/foodDetailsLoader";
import FoodTracking from "@screens/Dashboard/FoodTracking/FoodTracking";
import foodTrackingLoader from "@loaders/foodTrackingLoader";
import GroceryLists from "@screens/Dashboard/GroceryLists/GroceryLists";
import groceryListsLoader from "@loaders/groceryListsLoader";
import ProgressTracking from "@screens/Dashboard/ProgressTracking/ProgressTracking";
import progressTrackingLoader from "@loaders/progressTrackingLoader";
import TDEE from "@screens/Dashboard/TDEE/TDEE";
import tdeeLoader from "@loaders/tdeeLoader";
import RecipeDatabase from "@screens/Dashboard/RecipeDatabase/RecipeDatabase";
import recipeDatabaseLoader from "@loaders/recipeDatabaseLoader";
import RecipeDetails from "@screens/Dashboard/RecipeDatabase/RecipeDetails";
import recipeDetailsLoader from "@loaders/recipeDetailsLoader";
import CreateRecipe from "@screens/Dashboard/RecipeDatabase/CreateRecipe";
import createRecipeLoader from "@loaders/createRecipeLoader";
import editRecipeLoader from "@loaders/editRecipeLoader";
import Settings from "@screens/Dashboard/Settings/Settings";
import settingsLoader from "@loaders/settingsLoader";
import Error from "@screens/Error/Error";
import NotFound from "@screens/NotFound/NotFound";

// Lazy load Contact component for code splitting
const Contact = loadable(() => import("@screens/Contact/Contact"), { fallback: <div>Loading...</div> });

// Application route configuration
const routes: RouteObject[] = [
    {
        path: "/",
        element: <Layout />,
        errorElement: <Error />,
        children: [
            {
                index: true,
                element: <Home />,
                loader: homeLoader
            }, {
                path: "about",
                element: <About />,
                loader: aboutLoader
            },
            {
                path: "contact",
                element: <Contact />,
                loader: contactLoader
            },
            {
                path: "refund-policy",
                element: <RefundPolicy />,
                loader: refundPolicyLoader
            },
            {
                path: "terms-of-service",
                element: <TermsOfService />,
                loader: termsOfServiceLoader
            },
            {
                path: "privacy-policy",
                element: <PrivacyPolicy />,
                loader: privacyPolicyLoader
            }
        ]
    },
    {
        path: "sign-in",
        element: <SignIn />,
        loader: signInLoader,
        errorElement: <Error />
    },
    {
        path: "sign-up",
        element: <SignUp />,
        loader: signUpLoader,
        errorElement: <Error />
    },
    {
        path: "forgot-password",
        element: <ForgotPassword />,
        loader: forgotPasswordLoader,
        errorElement: <Error />
    },
    {
        path: "reset-password",
        element: <ResetPassword />,
        loader: resetPasswordLoader,
        errorElement: <Error />
    },
    {
        path: "confirm-email-change",
        element: <ConfirmEmailChange />,
        loader: confirmEmailChangeLoader,
        errorElement: <Error />
    },
    {
        path: "dashboard",
        element: <Dashboard />,
        loader: dashboardLoader,
        errorElement: <Error />
    },
    {
        path: "dashboard/favorites",
        element: <Favorites />,
        loader: favoritesLoader,
        errorElement: <Error />
    },
    {
        path: "dashboard/food-database",
        element: <FoodDatabase />,
        loader: foodDatabaseLoader,
        errorElement: <Error />
    },
    {
        path: "dashboard/food-database/:foodId",
        element: <FoodDetails />,
        loader: foodDetailsLoader,
        errorElement: <Error />
    },
    {
        path: "dashboard/food-tracking",
        element: <FoodTracking />,
        loader: foodTrackingLoader,
        errorElement: <Error />
    },
    {
        path: "dashboard/grocery-lists",
        element: <GroceryLists />,
        loader: groceryListsLoader,
        errorElement: <Error />
    },
    {
        path: "dashboard/progress-tracking",
        element: <ProgressTracking />,
        loader: progressTrackingLoader,
        errorElement: <Error />
    },
    {
        path: "dashboard/tdee",
        element: <TDEE />,
        loader: tdeeLoader,
        errorElement: <Error />
    },
    {
        path: "dashboard/recipe-database",
        element: <RecipeDatabase />,
        loader: recipeDatabaseLoader,
        errorElement: <Error />
    },
    {
        path: "dashboard/recipe-database/create",
        element: <CreateRecipe />,
        loader: createRecipeLoader,
        errorElement: <Error />
    },
    {
        path: "dashboard/recipe-database/:recipeId/edit",
        element: <CreateRecipe />,
        loader: editRecipeLoader,
        errorElement: <Error />
    },
    {
        path: "dashboard/recipe-database/:recipeId",
        element: <RecipeDetails />,
        loader: recipeDetailsLoader,
        errorElement: <Error />
    },
    {
        path: "dashboard/settings",
        element: <Settings />,
        loader: settingsLoader,
        errorElement: <Error />
    },
    {
        path: "*",
        element: <NotFound />
    }
];

export default routes;