// Initialize theme on page load
(() => {
  const savedTheme = localStorage.getItem("phx:theme") || "system";
  
  if (savedTheme === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", isDark ? "mocha" : "latte");
  } else {
    document.documentElement.setAttribute("data-theme", savedTheme);
  }
  
  // Hide indicator initially to prevent visible movement
  document.addEventListener('DOMContentLoaded', () => {
    const indicators = document.querySelectorAll(".theme-indicator");
    indicators.forEach(indicator => {
      indicator.style.opacity = "0";
      setInitialIndicatorPosition(savedTheme);
      // Show indicator after positioning
      setTimeout(() => {
        indicator.style.opacity = "1";
      }, 10);
    });
  });
  
  // Monitor for LiveView mount events
  window.addEventListener('phx:page-loading-stop', () => {
    const savedTheme = localStorage.getItem("phx:theme") || "system";
    setInitialIndicatorPosition(savedTheme);
  });
  
  // Monitor for DOM changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const indicator = document.getElementById("theme-indicator");
        if (indicator && mutation.target === indicator) {
          // Theme indicator classes changed
        }
      }
    });
  });
  
  document.addEventListener('DOMContentLoaded', () => {
    const indicators = document.querySelectorAll(".theme-indicator");
    indicators.forEach(indicator => {
      observer.observe(indicator, { attributes: true, attributeFilter: ['class'] });
    });
  });
})();

function setInitialIndicatorPosition(theme) {
  const indicators = document.querySelectorAll(".theme-indicator");
  indicators.forEach(indicator => {
    // Set position using inline styles to avoid class-based transitions
    if (theme === "system") {
      indicator.style.transform = "translateX(0%)";
    } else if (theme === "latte") {
      indicator.style.transform = "translateX(100%)";
    } else if (theme === "mocha") {
      indicator.style.transform = "translateX(200%)";
    }
  });
}

// Theme toggle functions
function setTheme(theme) {
  console.log("Setting theme:", theme);
  // Store the user's choice
  localStorage.setItem("phx:theme", theme);
  // Determine the actual theme to apply
  let actualTheme = theme;
  if (theme === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    actualTheme = isDark ? "mocha" : "latte";
  }
  document.documentElement.setAttribute("data-theme", actualTheme);
  // Move the indicator WITH animation
  moveIndicator(theme, true);
}

function moveIndicator(theme, animate) {
  const indicators = document.querySelectorAll(".theme-indicator");
  if (indicators.length === 0) {
    console.error("Theme indicators not found!");
    return;
  }
  
  indicators.forEach(indicator => {
    if (animate) {
      // Use classes for animated transitions
      indicator.classList.remove("translate-x-0", "translate-x-full", "translate-x-[200%]");
      indicator.classList.add("transition-transform");
      indicator.style.transform = ""; // Clear inline styles
      
      // Force a reflow
      indicator.offsetHeight;
      
      // Set the correct position using classes
      if (theme === "system") {
        indicator.classList.add("translate-x-0");
      } else if (theme === "latte") {
        indicator.classList.add("translate-x-full");
      } else if (theme === "mocha") {
        indicator.classList.add("translate-x-[200%]");
      }
    } else {
      // Use inline styles for instant positioning (no animation)
      indicator.classList.remove("transition-transform", "translate-x-0", "translate-x-full", "translate-x-[200%]");
      
      if (theme === "system") {
        indicator.style.transform = "translateX(0%)";
      } else if (theme === "latte") {
        indicator.style.transform = "translateX(100%)";
      } else if (theme === "mocha") {
        indicator.style.transform = "translateX(200%)";
      }
    }
  });
}

// Make setTheme function globally available
window.setTheme = setTheme; 