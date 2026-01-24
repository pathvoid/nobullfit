import React from "react";
import clsx from "clsx";

export interface MobileBottomMenuItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
}

export interface MobileBottomMenuProps {
    items: MobileBottomMenuItem[];
    className?: string;
}

// Mobile-only sticky bottom menu with icon and text buttons
export function MobileBottomMenu({ items, className }: MobileBottomMenuProps) {
    if (items.length === 0) return null;

    // Use compact mode for 4+ items
    const isCompact = items.length >= 4;

    return (
        <div
            className={clsx(
                // Only visible on mobile (hidden on sm and up)
                "sm:hidden",
                // Fixed positioning at the bottom
                "fixed bottom-0 left-0 right-0 z-50",
                // Styling
                "bg-white dark:bg-zinc-900",
                "border-t border-zinc-200 dark:border-zinc-700",
                "shadow-lg shadow-zinc-950/5 dark:shadow-zinc-950/50",
                // Safe area padding for devices with home indicators
                "pb-[env(safe-area-inset-bottom)]",
                className
            )}
        >
            <div className="flex w-full h-16">
                {items.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={item.onClick}
                        disabled={item.disabled}
                        className={clsx(
                            // Flex layout for icon + text
                            "flex flex-1 flex-col items-center justify-center gap-0.5",
                            // Padding - reduced horizontal for compact mode
                            isCompact ? "px-1" : "px-2",
                            // Typography - smaller for compact mode
                            isCompact ? "text-[10px]" : "text-xs",
                            "font-medium",
                            // Colors
                            "text-zinc-600 dark:text-zinc-400",
                            // Hover state
                            "hover:bg-zinc-50 dark:hover:bg-zinc-800",
                            "hover:text-zinc-900 dark:hover:text-zinc-100",
                            // Active state
                            "active:bg-zinc-100 dark:active:bg-zinc-700",
                            // Disabled state
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            "disabled:hover:bg-transparent dark:disabled:hover:bg-transparent",
                            // Focus state
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
                            // Transition
                            "transition-colors duration-150",
                            // Minimum width to prevent squishing
                            "min-w-0"
                        )}
                    >
                        <span className={clsx(
                            "flex items-center justify-center shrink-0",
                            isCompact ? "h-5 w-5" : "h-6 w-6"
                        )}>
                            {item.icon}
                        </span>
                        <span className="truncate w-full text-center leading-tight">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// Spacer component to prevent content from being hidden behind the menu
export function MobileBottomMenuSpacer({ className }: { className?: string }) {
    return (
        <div
            className={clsx(
                // Only visible on mobile
                "sm:hidden",
                // Height to match the menu (h-16 = 64px)
                "h-16",
                // Extra space for safe area
                "pb-[env(safe-area-inset-bottom)]",
                className
            )}
        />
    );
}
