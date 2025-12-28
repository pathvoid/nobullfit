import clsx from "clsx";
import { Text } from "./text";

type FormAlertVariant = "error" | "success" | "warning" | "info";

interface FormAlertProps {
    variant?: FormAlertVariant;
    children: React.ReactNode;
    className?: string;
}

// Form alert component - inline alert messages for forms
// Matches Catalyst design system styling
export function FormAlert({ variant = "error", children, className }: FormAlertProps) {
    const variantStyles = {
        error: {
            container: "border-red-500/50 bg-red-50/50 dark:bg-red-950/10 dark:border-red-500/30",
            text: "text-red-600 dark:text-red-400"
        },
        success: {
            container: "border-green-500/50 bg-green-50/50 dark:bg-green-950/10 dark:border-green-500/30",
            text: "text-green-600 dark:text-green-400"
        },
        warning: {
            container: "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/10 dark:border-yellow-500/30",
            text: "text-yellow-600 dark:text-yellow-400"
        },
        info: {
            container: "border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/10 dark:border-blue-500/30",
            text: "text-blue-600 dark:text-blue-400"
        }
    };

    const styles = variantStyles[variant];

    return (
        <div
            className={clsx(
                className,
                // Base styles matching Catalyst components
                "rounded-lg border p-3.5 sm:p-3",
                // Subtle shadow and ring matching Catalyst input styling
                "shadow-xs ring-1 ring-zinc-950/5 dark:ring-white/10",
                styles.container
            )}
            role="alert"
            aria-live="polite"
        >
            <Text className={clsx(styles.text, "text-sm/6 font-medium")}>
                {children}
            </Text>
        </div>
    );
}

