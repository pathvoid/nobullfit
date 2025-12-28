// Utility function to delay execution (useful for simulating async operations)
export const sleep = (n = 500) => new Promise((r) => setTimeout(r, n));

// Generate a random integer between 0 and 100
export const rand = () => Math.round(Math.random() * 100);