# NoBullFit

NoBullFit is a privacy-first health and fitness tracking platform designed to help you monitor your nutrition, discover recipes, track your progress, and manage your wellness journey — all while keeping your data private and secure.

## About

NoBullFit is source-available software, meaning the source code is publicly accessible for transparency and learning purposes. The platform is currently under active development but is already available for free use at [nobull.fit](https://nobull.fit).

We prioritize data privacy above all else. Your information belongs to you, and we don't sell your data to third parties. Essential features will always remain free, ensuring that privacy and basic functionality are not premium features.

## Features

### Food Database
Browse a comprehensive database of foods with detailed nutritional information powered by Open Food Facts. Search for foods, view complete macronutrient and micronutrient breakdowns, and access measurement options for accurate tracking.

### Food Tracking
Log your daily meals and snacks with detailed nutritional tracking. Organize entries by meal categories (Breakfast, Lunch, Dinner, Snack, Other), track calories and macronutrients, and maintain a complete food diary. Support for both individual food items and recipe-based entries.

### Recipe Database
Discover and create recipes with complete nutritional breakdowns. Save your own recipes, browse public recipes from other users, and log recipe servings directly to your food tracking. Each recipe includes detailed ingredient lists, step-by-step instructions, and per-serving nutritional information.

### Progress Tracking
Monitor your fitness activities and exercises. Log various activity types including running, weightlifting, HIIT, and more. Track calories burned, activity-specific metrics (distance, duration, pace, reps, sets, etc.), and view your activity history over time.

### Weight Tracking
Record and monitor your weight over time with support for both kilograms and pounds. Automatic unit conversion ensures consistent tracking regardless of your preferred unit. View weight trends in the dashboard overview.

### Dashboard Overview
Comprehensive data visualization with interactive charts and statistics. View daily calorie consumption vs. calories burned, macronutrient breakdowns, activity type distributions, food category analysis, and weight trends. Filter data by time period (7 days, 30 days, or all time).

### PDF Health Reports
Generate professional PDF reports of your health and nutrition data. Reports include a branded cover page, executive summary with TDEE/BMR metrics, detailed daily food logs showing every item you've eaten, comprehensive activity logs, macronutrient analysis, and weight progress tracking. Perfect for sharing with healthcare professionals or keeping personal records. Reports can be generated for the last 7 days, 30 days, or all time.

### Grocery Lists
Create and manage multiple grocery lists. Add items from the food database or recipes, track quantities and units, and organize your shopping efficiently.

### Favorites
Save your frequently used foods and recipes for quick access. Quickly add favorited items to your food tracking or grocery lists.

### Data Management
Export all your data in JSON format, including recipes, favorites, grocery lists, food tracking entries, and progress tracking data. Delete specific data by time period (7 days, 30 days, or all time) with granular control over what to remove.

## Pro Features ($10/month)

The following features are available exclusively to Pro subscribers. Subscribe to Pro from the plan selection page during signup or from the Billing page in your dashboard.

### Meal Planner (Food Tracking Enhancements)
Pro users will have access to advanced meal planning capabilities:

- **Future Meal Planning**: Plan your meals for upcoming days, not just today or past dates. Perfect for weekly meal prep and planning ahead.
- **Copy Day**: Copy all meals from one day and paste them to another day, making it easy to replicate successful eating days.
- **Copy Week**: Copy an entire week's worth of meals to another week — ideal for maintaining consistent meal plans.
- **Drag-and-Drop Organization**: Reorganize meals between categories (Breakfast, Lunch, Dinner, Snack, Other) by simply dragging and dropping. Pro users also see all meal categories for easy organization.

### Activity Planner (Progress Tracking Enhancements)
Pro users will have access to advanced activity planning capabilities:

- **Future Activity Planning**: Log activities for upcoming days, not just today or past dates. Perfect for planning workout schedules ahead of time.
- **Copy Day**: Copy all activities from one day and paste them to another day, making it easy to replicate successful training days.
- **Copy Week**: Copy an entire week's worth of activities to another week — ideal for maintaining consistent workout routines.

### Weight Goal Tracking (TDEE & Dashboard Enhancements)
Pro users can set personalized weight goals with intelligent insights:

- **Weight Objective Setting**: Set your goal to lose, maintain, or gain weight in the TDEE Calculator page. Optionally specify a target weight.
- **Automatic Macro Recommendations**: Receive personalized macro ratio recommendations based on your goal (e.g., higher protein for weight loss to preserve muscle, balanced ratios for maintenance, higher carbs/protein for muscle building).
- **Recommended Daily Calories**: Automatic calorie adjustments based on your TDEE and goal (deficit for weight loss, surplus for muscle gain).
- **Weekly Target Adjustments**: Track your weekly progress with recommended weight change targets.
- **Progress Tracking**: See your actual weekly weight change compared to your target, with visual feedback on whether you're on track.
- **Goal Timeline Projection**: If a target weight is set, see a projected date for reaching your goal based on your current progress.

### Customizable PDF Reports
Pro users can personalize their health reports:

- **Section Selection**: Choose exactly which sections to include in your PDF report before generating it.
- **Flexible Reporting**: Select from Executive Summary, TDEE & Metabolic Profile, Daily Summary Table, Detailed Food Logs, Detailed Activity Logs, and Weight History.
- **Optimized Generation**: Reports are generated faster by only processing the sections you need.
- **Tailored Reports**: Create focused reports for specific purposes, like sharing only your activity logs with a trainer or just your nutrition data with a dietitian.

## Technology Stack

NoBullFit is built with modern web technologies:

- **Backend**: Express.js with TypeScript
- **Frontend**: React with Vite and Server-Side Rendering (SSR)
- **Database**: PostgreSQL
- **Food Data**: Open Food Facts with DuckDB
- **Data Visualization**: Recharts

## Development Status

NoBullFit is actively under development. While the platform is functional and available for use, new features and improvements are continuously being added. We welcome feedback and bug reports, but please note that we are not currently accepting pull requests.

## Privacy Commitment

Your data privacy is our foundation. We collect only the minimum data necessary to provide the service, and we never sell your information to third parties. All data is stored securely, and you have full control over your information with the ability to export or delete your data at any time.

## License

NoBullFit is source-available. The source code is publicly accessible for transparency and educational purposes.

## Getting Started

Visit [nobull.fit](https://nobull.fit) to create a free account and start tracking your health journey today.
