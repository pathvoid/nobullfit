"use client";

import { useState, useEffect, useRef } from "react";

interface MaintenanceStatus {
    hasUpcoming: boolean;
    isInProgress: boolean;
    maintenance: {
        startTime: string;
        endTime: string;
    } | null;
}

// Cache key for session storage
const CACHE_KEY = "maintenance_status_cache";

// Format date for display in user's timezone
function formatMaintenanceDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short"
    }).format(date);
}

// Get cached status from sessionStorage
function getCachedStatus(): MaintenanceStatus | null {
    if (typeof window === "undefined") return null;
    try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : null;
    } catch {
        return null;
    }
}

// Save status to sessionStorage
function setCachedStatus(status: MaintenanceStatus): void {
    if (typeof window === "undefined") return;
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(status));
    } catch {
        // Ignore storage errors
    }
}

export function MaintenanceBanner() {
    // Initialize with null/false to match server render and avoid hydration mismatch
    const [status, setStatus] = useState<MaintenanceStatus | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Determine if banner should be shown
    const shouldShow = status?.maintenance && (!dismissed || status.isInProgress);

    // On mount, check cache immediately to restore state without animation
    useEffect(() => {
        setHasMounted(true);
        
        const cachedStatus = getCachedStatus();
        const dismissedKey = localStorage.getItem("maintenance_dismissed");
        const wasDismissed = cachedStatus?.maintenance && dismissedKey === cachedStatus.maintenance.startTime;
        const cachedShouldShow = cachedStatus?.maintenance && (!wasDismissed || cachedStatus.isInProgress);

        if (cachedStatus) {
            setStatus(cachedStatus);
        }
        if (wasDismissed) {
            setDismissed(true);
        }
        if (cachedShouldShow) {
            setIsVisible(true);
        }
    }, []);

    // Update CSS variable for sidebar offset when banner visibility changes
    useEffect(() => {
        if (!hasMounted) return;

        if (shouldShow && contentRef.current) {
            const height = contentRef.current.offsetHeight || 0;
            document.documentElement.style.setProperty("--maintenance-banner-height", `${height}px`);
            setIsVisible(true);
        } else {
            document.documentElement.style.setProperty("--maintenance-banner-height", "0px");
            setIsVisible(false);
        }
    }, [shouldShow, hasMounted]);

    useEffect(() => {
        async function fetchMaintenanceStatus() {
            try {
                const response = await fetch("/api/maintenance/status");
                if (response.ok) {
                    const data: MaintenanceStatus = await response.json();
                    setStatus(data);
                    setCachedStatus(data);
                    
                    // Check if this maintenance was already dismissed
                    const currentDismissedKey = localStorage.getItem("maintenance_dismissed");
                    if (data.maintenance && currentDismissedKey === data.maintenance.startTime) {
                        setDismissed(true);
                    } else if (currentDismissedKey && !data.maintenance) {
                        // Clear old dismissed key if no maintenance
                        localStorage.removeItem("maintenance_dismissed");
                    }
                }
            } catch (error) {
                // Silently fail - don't show banner if we can't fetch status
                console.error("Failed to fetch maintenance status:", error);
            }
        }

        fetchMaintenanceStatus();
        
        // Refresh status every 5 minutes
        const interval = setInterval(fetchMaintenanceStatus, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const handleDismiss = () => {
        if (status?.maintenance && !status.isInProgress) {
            localStorage.setItem("maintenance_dismissed", status.maintenance.startTime);
            setDismissed(true);
        }
    };

    const maintenance = status?.maintenance;
    const isInProgress = status?.isInProgress;

    // Use suppressHydrationWarning on dynamic elements to avoid warnings
    // The server always renders collapsed, client expands after mount
    return (
        <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{ maxHeight: isVisible ? "100px" : "0px" }}
            suppressHydrationWarning
        >
            <div
                ref={contentRef}
                className={`flex items-center justify-center gap-2 px-4 py-2 text-sm ${
                    isInProgress
                        ? "bg-amber-500 text-white"
                        : "bg-blue-500 text-white"
                }`}
                suppressHydrationWarning
            >
                <span className="text-center" suppressHydrationWarning>
                    {isInProgress ? (
                        <>
                            <strong>Maintenance in progress</strong> — The website may be temporarily unavailable.
                        </>
                    ) : maintenance ? (
                        <>
                            <strong>Scheduled maintenance:</strong>{" "}
                            {formatMaintenanceDate(maintenance.startTime)} — Brief downtime may occur.
                        </>
                    ) : null}
                </span>
                {!isInProgress && maintenance && (
                    <button
                        onClick={handleDismiss}
                        className="ml-2 shrink-0 rounded px-2 py-0.5 text-xs font-medium hover:bg-white/20 transition-colors"
                        aria-label="Dismiss notification"
                    >
                        Dismiss
                    </button>
                )}
            </div>
        </div>
    );
}
