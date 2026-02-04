import clsx from "clsx";

type SkeletonProps = {
    className?: string;
    variant?: "text" | "circular" | "rectangular" | "button";
    width?: string | number;
    height?: string | number;
};

// Reusable skeleton loader component for showing loading placeholders
export function Skeleton({ className, variant = "rectangular", width, height }: SkeletonProps) {
    const baseClasses = "block animate-pulse bg-zinc-400 dark:bg-zinc-800";

    const variantClasses = {
        text: "rounded",
        circular: "rounded-full",
        rectangular: "rounded-md",
        button: "rounded-lg"
    };

    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === "number" ? `${width}px` : width;
    if (height) style.height = typeof height === "number" ? `${height}px` : height;

    return (
        <span
            className={clsx(baseClasses, variantClasses[variant], className)}
            style={style}
            aria-hidden="true"
        />
    );
}

// Skeleton that mimics a button's dimensions
export function ButtonSkeleton({ className, outline }: { className?: string; outline?: boolean }) {
    return (
        <span
            className={clsx(
                "inline-block h-[38px] w-[100px] sm:h-[34px] rounded-lg animate-pulse",
                outline
                    ? "border border-zinc-500 dark:border-zinc-600 bg-transparent"
                    : "bg-zinc-400 dark:bg-zinc-800",
                className
            )}
            aria-hidden="true"
        />
    );
}
