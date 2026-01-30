import { useState, useEffect } from "react";

// Tailwind 'sm' breakpoint (640px)
const DESKTOP_BREAKPOINT = 640;

// SSR-safe hook to detect desktop viewport
export function useDesktopOnly(): boolean {
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        // Check if window is available (client-side only)
        if (typeof window === "undefined") return;

        const mediaQuery = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);

        // Set initial value
        setIsDesktop(mediaQuery.matches);

        // Listen for changes
        const handleChange = (e: MediaQueryListEvent) => {
            setIsDesktop(e.matches);
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    return isDesktop;
}

export default useDesktopOnly;
