const ThemeToggle = {
  mounted() {
    // Initialize theme from saved preference or default to system
    const savedTheme = this.getSavedTheme() || "system";
    this.applyTheme(savedTheme);

    // Listen for theme change events from LiveView
    this.handleEvent("phx:set-theme", (event) => {
      const theme = event.detail.theme;
      this.applyTheme(theme);
    });
  },

  // Apply the theme to the document
  applyTheme(theme) {
    // Store user's theme preference
    localStorage.setItem("phx:theme", theme);

    // Determine actual theme to apply (system theme resolves to latte/mocha)
    let actualTheme = theme;
    if (theme === "system") {
      actualTheme = this.getSystemTheme();
    }
    document.documentElement.setAttribute("data-theme", actualTheme);

    // Update visual indicator position
    this.moveIndicator(theme);
  },

  // Detect system color scheme preference
  getSystemTheme() {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return isDark ? "mocha" : "latte";
  },

  // Get the user's saved theme preference
  getSavedTheme() {
    return localStorage.getItem("phx:theme");
  },

  // Move the indicator to the correct position
  moveIndicator(theme) {
    const indicator = document.getElementById("theme-indicator");
    if (!indicator) {
      return;
    }
    
    // Remove existing transform classes
    indicator.classList.remove("translate-x-0", "translate-x-full", "translate-x-[200%]");
    
    // Force reflow to ensure class removal is applied
    indicator.offsetHeight;
    
    // Apply new transform class based on theme
    setTimeout(() => {
      if (theme === "system") {
        indicator.classList.add("translate-x-0");
      } else if (theme === "latte") {
        indicator.classList.add("translate-x-full");
      } else if (theme === "mocha") {
        indicator.classList.add("translate-x-[200%]");
      }
    }, 10);
  }
};

export default ThemeToggle;