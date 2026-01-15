import "@testing-library/jest-dom";

// Mock ResizeObserver for Headless UI components
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
} as any; // eslint-disable-line @typescript-eslint/no-explicit-any
