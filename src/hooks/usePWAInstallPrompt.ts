import { useEffect, useRef } from "react";
import { toast } from "sonner";

// Key for localStorage to track if user has seen the install prompt
const INSTALL_PROMPT_SHOWN_KEY = "nobullfit_pwa_install_prompt_shown";

// Extend window type to include beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
    interface WindowEventMap {
        beforeinstallprompt: BeforeInstallPromptEvent;
    }
}

// Detects if the user is on a mobile device
function isMobileDevice(): boolean {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
        return false;
    }

    const userAgent = navigator.userAgent || navigator.vendor || "";

    // Check for common mobile keywords
    const mobileKeywords = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;

    // Also check for touch capability and screen width as additional signals
    const hasTouchScreen = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;

    return mobileKeywords.test(userAgent) || (hasTouchScreen && isSmallScreen);
}

// Checks if the app is already installed as PWA
function isStandalone(): boolean {
    if (typeof window === "undefined") {
        return false;
    }

    // Check display-mode media query
    const isDisplayModeStandalone = window.matchMedia("(display-mode: standalone)").matches;

    // Check iOS-specific standalone mode
    const isIOSStandalone = ("standalone" in window.navigator) &&
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    return isDisplayModeStandalone || isIOSStandalone;
}

// Checks if we've already shown the install prompt
function hasShownInstallPrompt(): boolean {
    if (typeof localStorage === "undefined") {
        return true; // Assume shown if we can't check
    }

    try {
        return localStorage.getItem(INSTALL_PROMPT_SHOWN_KEY) === "true";
    } catch {
        return true; // Assume shown if localStorage access fails
    }
}

// Marks the install prompt as shown
function markInstallPromptShown(): void {
    if (typeof localStorage === "undefined") {
        return;
    }

    try {
        localStorage.setItem(INSTALL_PROMPT_SHOWN_KEY, "true");
    } catch {
        // Silently fail if localStorage is not available
    }
}

/**
 * Hook to show a PWA install prompt notification on mobile devices.
 * The prompt will only appear once per device.
 */
export function usePWAInstallPrompt(): void {
    const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        // SSR guard
        if (typeof window === "undefined") {
            return;
        }

        // Don't show if already installed as PWA
        if (isStandalone()) {
            return;
        }

        // Don't show on non-mobile devices
        if (!isMobileDevice()) {
            return;
        }

        // Don't show if we've already shown the prompt
        if (hasShownInstallPrompt()) {
            return;
        }

        const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
            // Prevent the default mini-infobar from appearing on mobile
            e.preventDefault();

            // Store the event for later use
            deferredPromptRef.current = e;

            // Mark as shown before displaying to prevent re-showing on refresh
            markInstallPromptShown();

            // Show Sonner toast with install action
            toast("Add NoBullFit to Home Screen", {
                description: "Get quick access to your fitness dashboard like a native app.",
                duration: 10000,
                action: {
                    label: "Install",
                    onClick: async () => {
                        if (deferredPromptRef.current) {
                            await deferredPromptRef.current.prompt();
                            const choiceResult = await deferredPromptRef.current.userChoice;

                            if (choiceResult.outcome === "accepted") {
                                toast.success("NoBullFit has been added to your home screen!");
                            }

                            // Clear the deferred prompt since it can only be used once
                            deferredPromptRef.current = null;
                        }
                    }
                }
            });
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, []);
}

export default usePWAInstallPrompt;
