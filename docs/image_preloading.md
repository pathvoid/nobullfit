# Image Preloading Feature

## Overview

The NoBullFit application now includes an intelligent image preloading system that improves website loading performance by preloading commonly used images in the background.

## How It Works

### 1. Common Image Preloading
When the page loads, the system automatically preloads all commonly used images across the application:
- Home page images (avocado.png)
- Dashboard images (orange-waiting.png, apple-heart.png, apple.png)
- Food and recipe database images (pantry.png, cooking-pot.png)
- Grocery images (shopping.png)
- About page images (campfire.png)
- Article images (dragonfruit-sauce.png, pineapple-math.png, professor-pear.png)
- Legal document images (banana-secret-service.png, kiwi-lawyer.png)

### 2. Page-Specific Preloading
The system intelligently preloads images specific to the current page:
- `/` → avocado.png
- `/about` → campfire.png
- `/dashboard` → orange-waiting.png, apple-heart.png, apple.png
- `/dashboard/food-database` → pantry.png, no-image-300x300.jpg
- `/dashboard/recipe-database` → cooking-pot.png, no-image-300x300.jpg
- `/dashboard/favorites` → apple-heart.png, no-image-300x300.jpg
- `/dashboard/groceries` → shopping.png
- `/dashboard/progress` → apple.png

### 3. Navigation Prediction
The system predicts which pages users are likely to visit next and preloads those images:
- From home → about, dashboard
- From about → home, dashboard
- From dashboard → food-database, recipe-database, favorites
- From food-database → recipe-database, favorites
- From recipe-database → food-database, favorites
- From favorites → food-database, recipe-database
- From groceries → food-database, recipe-database
- From progress → favorites

### 4. Hover-Based Preloading
When users hover over navigation links, the system immediately preloads images for the target page, providing instant loading when they click.

## Performance Benefits

1. **Faster Page Transitions**: Images are already cached when users navigate between pages
2. **Improved User Experience**: No loading delays for commonly used images
3. **Reduced Server Load**: Images are loaded once and cached in the browser
4. **Intelligent Resource Management**: Only loads images that are likely to be needed

## Technical Implementation

### Files
- `assets/js/image_preloader.js` - Main preloading logic
- `assets/js/app.js` - Navigation hover hook integration
- `lib/nobullfit_web/components/navigation.ex` - Navigation component with preload hook

### Key Features
- **Caching**: Tracks which images have already been preloaded to avoid duplicates
- **Error Handling**: Gracefully handles failed image loads
- **Console Logging**: Provides debugging information in browser console
- **LiveView Integration**: Works seamlessly with Phoenix LiveView navigation

### Browser Console Output
```
Starting image preloading...
Number of loaded images: 1
Number of loaded images: 2
...
All common images were preloaded successfully
Preloading images for page: /
Page-specific images preloaded for: /
Preloading related page images for: /
Related page images preloaded for: /
```

## Configuration

The image preloading system is automatically enabled and requires no additional configuration. The system:

1. Loads when the DOM is ready
2. Integrates with LiveView navigation events
3. Responds to navigation link hover events
4. Caches preloaded images to avoid redundant requests

## Future Enhancements

Potential improvements could include:
- User behavior analysis to improve prediction accuracy
- Bandwidth-aware preloading (slower connections)
- Priority-based preloading (critical vs. non-critical images)
- A/B testing to measure performance improvements
