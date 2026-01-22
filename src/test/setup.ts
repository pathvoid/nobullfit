import "@testing-library/jest-dom";

// Mock ResizeObserver for Headless UI components
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
} as any; // eslint-disable-line @typescript-eslint/no-explicit-any

// Mock sessionStorage
const sessionStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
        get length() {
            return Object.keys(store).length;
        },
        key: (index: number) => {
            const keys = Object.keys(store);
            return keys[index] || null;
        }
    };
})();

Object.defineProperty(global, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true
});
