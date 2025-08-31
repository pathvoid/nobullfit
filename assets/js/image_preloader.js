// Image preloader for NoBullFit
// This module preloads commonly used images to improve website loading performance

// Cache to track which images have already been preloaded
const preloadedImages = new Set();

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
      console.log('Number of loaded images: ' + loadedCounter);
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
      console.warn('Failed to preload image:', url);
      // Don't add failed images to cache, but continue
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
  '/dashboard': [
    'https://cdn.nobull.fit/orange-waiting.png',
    'https://cdn.nobull.fit/apple-heart.png',
    'https://cdn.nobull.fit/apple.png'
  ],
  '/dashboard/food-database': [
    'https://cdn.nobull.fit/pantry.png',
    'https://cdn.nobull.fit/no-image-300x300.jpg'
  ],
  '/dashboard/recipe-database': [
    'https://cdn.nobull.fit/cooking-pot.png',
    'https://cdn.nobull.fit/no-image-300x300.jpg'
  ],
  '/dashboard/favorites': [
    'https://cdn.nobull.fit/apple-heart.png',
    'https://cdn.nobull.fit/no-image-300x300.jpg'
  ],
  '/dashboard/groceries': [
    'https://cdn.nobull.fit/shopping.png'
  ],
  '/dashboard/progress': [
    'https://cdn.nobull.fit/apple.png'
  ]
};

// Function to get current page path
function getCurrentPage() {
  return window.location.pathname;
}

// Function to preload images for a specific page
function preloadPageImages(pagePath) {
  const images = pageImages[pagePath] || [];
  if (images.length > 0) {
    console.log(`Preloading images for page: ${pagePath}`);
    preloadImages(images, function() {
      console.log(`Page-specific images preloaded for: ${pagePath}`);
    });
  }
}

// Function to preload images for related pages (navigation prediction)
function preloadRelatedPageImages(currentPage) {
  const relatedPages = {
    '/': ['/about', '/dashboard'],
    '/about': ['/', '/dashboard'],
    '/dashboard': ['/dashboard/food-database', '/dashboard/recipe-database', '/dashboard/favorites'],
    '/dashboard/food-database': ['/dashboard/recipe-database', '/dashboard/favorites'],
    '/dashboard/recipe-database': ['/dashboard/food-database', '/dashboard/favorites'],
    '/dashboard/favorites': ['/dashboard/food-database', '/dashboard/recipe-database'],
    '/dashboard/groceries': ['/dashboard/food-database', '/dashboard/recipe-database'],
    '/dashboard/progress': ['/dashboard/favorites']
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
    console.log(`Preloading related page images for: ${currentPage}`);
    preloadImages(uniqueImages, function() {
      console.log(`Related page images preloaded for: ${currentPage}`);
    });
  }
}

// Initialize image preloading when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('Starting image preloading...');
  
  // Preload common images first
  preloadImages(commonImages, function() {
    console.log('All common images were preloaded successfully');
    
    // Then preload page-specific images
    const currentPage = getCurrentPage();
    preloadPageImages(currentPage);
    
    // Finally preload related page images
    setTimeout(() => {
      preloadRelatedPageImages(currentPage);
    }, 1000); // Small delay to prioritize current page
  });
});

// Listen for LiveView navigation events to preload images for new pages
document.addEventListener('phx:page-loading-start', function() {
  // Preload images for the page being navigated to
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
