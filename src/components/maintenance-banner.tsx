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
    // Initialize with cached status to avoid animation on page transitions
    const cachedStatus = getCachedStatus();
    const dismissedKey = typeof window !== "undefined" ? localStorage.getItem("maintenance_dismissed") : null;
    const initialDismissed = cachedStatus?.maintenance && dismissedKey === cachedStatus.maintenance.startTime;
    const initialShouldShow = cachedStatus?.maintenance && (!initialDismissed || cachedStatus.isInProgress);

    const [status, setStatus] = useState<MaintenanceStatus | null>(cachedStatus);
    const [dismissed, setDismissed] = useState(!!initialDismissed);
    const [isVisible, setIsVisible] = useState(!!initialShouldShow);
    const contentRef = useRef<HTMLDivElement>(null);

    // Determine if banner should be shown
    const shouldShow = status?.maintenance && (!dismissed || status.isInProgress);

    // Update CSS variable for sidebar offset when banner visibility changes
    useEffect(() => {
        if (shouldShow && contentRef.current) {
            const height = contentRef.current.offsetHeight || 0;
            document.documentElement.style.setProperty("--maintenance-banner-height", `${height}px`);
            setIsVisible(true);
        } else {
            document.documentElement.style.setProperty("--maintenance-banner-height", "0px");
            setIsVisible(false);
        }
        // No cleanup - we don't want to reset on unmount as it causes the sidebar to jump
    }, [shouldShow]);

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

    return (
        <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{ maxHeight: isVisible ? "100px" : "0px" }}
        >
            <div
                ref={contentRef}
                className={`flex items-center justify-center gap-2 px-4 py-2 text-sm ${
                    isInProgress
                        ? "bg-amber-500 text-white"
                        : "bg-blue-500 text-white"
                }`}
            >
                <span className="text-center">
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
