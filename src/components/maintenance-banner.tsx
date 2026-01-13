"use client";

import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Wrench } from "lucide-react";

interface MaintenanceStatus {
    hasUpcoming: boolean;
    isInProgress: boolean;
    maintenance: {
        startTime: string;
        endTime: string;
    } | null;
}

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

export function MaintenanceBanner() {
    const [status, setStatus] = useState<MaintenanceStatus | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const bannerRef = useRef<HTMLDivElement>(null);

    // Update CSS variable for sidebar offset when banner visibility changes
    useEffect(() => {
        const shouldShow = status?.maintenance && (!dismissed || status.isInProgress);
        
        if (shouldShow && bannerRef.current) {
            const height = bannerRef.current.offsetHeight;
            document.documentElement.style.setProperty("--maintenance-banner-height", `${height}px`);
        } else {
            document.documentElement.style.setProperty("--maintenance-banner-height", "0px");
        }

        return () => {
            document.documentElement.style.setProperty("--maintenance-banner-height", "0px");
        };
    }, [status, dismissed]);

    useEffect(() => {
        // Check if banner was dismissed for this maintenance
        const dismissedKey = typeof window !== "undefined" ? localStorage.getItem("maintenance_dismissed") : null;
        
        async function fetchMaintenanceStatus() {
            try {
                const response = await fetch("/api/maintenance/status");
                if (response.ok) {
                    const data: MaintenanceStatus = await response.json();
                    setStatus(data);
                    
                    // Check if this maintenance was already dismissed
                    if (data.maintenance && dismissedKey === data.maintenance.startTime) {
                        setDismissed(true);
                    } else if (dismissedKey && !data.maintenance) {
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

    // Don't render if no maintenance or dismissed (but always show if in progress)
    if (!status?.maintenance || (dismissed && !status.isInProgress)) {
        return null;
    }

    const handleDismiss = () => {
        if (status?.maintenance && !status.isInProgress) {
            localStorage.setItem("maintenance_dismissed", status.maintenance.startTime);
            setDismissed(true);
        }
    };

    const { maintenance, isInProgress } = status;

    return (
        <div
            ref={bannerRef}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm ${
                isInProgress
                    ? "bg-amber-500 text-white"
                    : "bg-blue-500 text-white"
            }`}
        >
            {isInProgress ? (
                <></>
            ) : (
                <></>
            )}
            <span className="text-center">
                {isInProgress ? (
                    <>
                        <strong>Maintenance in progress</strong> — The website may be temporarily unavailable.
                    </>
                ) : (
                    <>
                        <strong>Scheduled maintenance:</strong>{" "}
                        {formatMaintenanceDate(maintenance.startTime)} — Brief downtime may occur.
                    </>
                )}
            </span>
            {!isInProgress && (
                <button
                    onClick={handleDismiss}
                    className="ml-2 shrink-0 rounded px-2 py-0.5 text-xs font-medium hover:bg-white/20 transition-colors"
                    aria-label="Dismiss notification"
                >
                    Dismiss
                </button>
            )}
        </div>
    );
}
