// Image preloader for NoBullFit
// This module preloads commonly used images to improve website loading performance

// Cache to track which images have already been preloaded
const preloadedImages = new Set();

/**
 * Preload a list of image URLs.
 * @param {string[]} urls - Array of image URLs to preload.
 * @param {function} allImagesLoadedCallback - Callback when all images are loaded.
 */
function preloadImages(urls, allImagesLoadedCallback) {
  var loadedCounter = 0;
  var toBeLoadedNumber = urls.length;
  
  if (toBeLoadedNumber === 0) {
    allImagesLoadedCallback();
    return;
  }
  
  // Filter out already preloaded images
  const imagesToLoad = urls.filter(url => !preloadedImages.has(url));
  
  if (imagesToLoad.length === 0) {
    allImagesLoadedCallback();
    return;
  }
  
  imagesToLoad.forEach(function(url) {
    preloadImage(url, function() {
      loadedCounter++;
      if (loadedCounter == imagesToLoad.length) {
        allImagesLoadedCallback();
      }
    });
  });
  
  function preloadImage(url, anImageLoadedCallback) {
    var img = new Image();
    img.onload = function() {
      preloadedImages.add(url);
      anImageLoadedCallback();
    };
    img.onerror = function() {
      anImageLoadedCallback();
    };
    img.src = url;
  }
}

// List of commonly used images across the application
const commonImages = [
  // Home page
  'https://cdn.nobull.fit/avocado.png',
  
  // Dashboard images
  'https://cdn.nobull.fit/orange-waiting.png',
  'https://cdn.nobull.fit/apple-heart.png',
  'https://cdn.nobull.fit/apple.png',
  
  // Food and recipe database
  'https://cdn.nobull.fit/pantry.png',
  'https://cdn.nobull.fit/cooking-pot.png',
  'https://cdn.nobull.fit/no-image-300x300.jpg',
  
  // Groceries
  'https://cdn.nobull.fit/shopping.png',
  
  // About page
  'https://cdn.nobull.fit/campfire.png',
  
  // Article images
  'https://cdn.nobull.fit/dragonfruit-sauce.png',
  'https://cdn.nobull.fit/pineapple-math.png',
  'https://cdn.nobull.fit/professor-pear.png',
  
  // Legal documents
  'https://cdn.nobull.fit/banana-secret-service.png',
  'https://cdn.nobull.fit/kiwi-lawyer.png'
];

// Page-specific image mappings for intelligent preloading
const pageImages = {
  '/': ['https://cdn.nobull.fit/avocado.png'],
  '/about': ['https://cdn.nobull.fit/campfire.png'],
  '/d': [
    'https://cdn.nobull.fit/orange-waiting.png',
    'https://cdn.nobull.fit/apple-heart.png',
    'https://cdn.nobull.fit/apple.png'
  ],
  '/d/food-database': [
    'https://cdn.nobull.fit/pantry.png',
    'https://cdn.nobull.fit/no-image-300x300.jpg'
  ],
  '/d/recipe-database': [
    'https://cdn.nobull.fit/cooking-pot.png',
    'https://cdn.nobull.fit/no-image-300x300.jpg'
  ],
  '/d/favorites': [
    'https://cdn.nobull.fit/apple-heart.png',
    'https://cdn.nobull.fit/no-image-300x300.jpg'
  ],
  '/d/groceries': [
    'https://cdn.nobull.fit/shopping.png'
  ],
  '/d/progress': [
    'https://cdn.nobull.fit/apple.png'
  ]
};

/**
 * Get the current page path.
 * @returns {string} The current window location pathname.
 */
function getCurrentPage() {
  return window.location.pathname;
}

/**
 * Preload images for a specific page.
 * @param {string} pagePath - The page path to preload images for.
 */
function preloadPageImages(pagePath) {
  const images = pageImages[pagePath] || [];
  if (images.length > 0) {
    preloadImages(images, function() {});
  }
}

/**
 * Preload images for related pages (navigation prediction).
 * @param {string} currentPage - The current page path.
 */
function preloadRelatedPageImages(currentPage) {
  const relatedPages = {
    '/': ['/about', '/d'],
    '/about': ['/', '/d'],
    '/d': ['/d/food-database', '/d/recipe-database', '/d/favorites'],
    '/d/food-database': ['/d/recipe-database', '/d/favorites'],
    '/d/recipe-database': ['/d/food-database', '/d/favorites'],
    '/d/favorites': ['/d/food-database', '/d/recipe-database'],
    '/d/groceries': ['/d/food-database', '/d/recipe-database'],
    '/d/progress': ['/d/favorites']
  };
  
  const related = relatedPages[currentPage] || [];
  const relatedImages = [];
  
  related.forEach(page => {
    const pageImageList = pageImages[page] || [];
    relatedImages.push(...pageImageList);
  });
  
  // Remove duplicates
  const uniqueImages = [...new Set(relatedImages)];
  
  if (uniqueImages.length > 0) {
    preloadImages(uniqueImages, function() {});
  }
}

// Initialize image preloading when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  preloadImages(commonImages, function() {
    const currentPage = getCurrentPage();
    preloadPageImages(currentPage);
    setTimeout(() => {
      preloadRelatedPageImages(currentPage);
    }, 1000);
  });
});

// Listen for LiveView navigation events to preload images for new pages
document.addEventListener('phx:page-loading-start', function() {
  const currentPage = getCurrentPage();
  preloadRelatedPageImages(currentPage);
});

// Export for use in other modules
window.ImagePreloader = {
  preloadImages: preloadImages,
  preloadPageImages: preloadPageImages,
  preloadRelatedPageImages: preloadRelatedPageImages,
  commonImages: commonImages,
  pageImages: pageImages,
  preloadedImages: preloadedImages
};
