import clsx from "clsx";

export interface KeyboardHint {
    keys: string[];
    label: string;
}

export interface KeyboardHintsProps {
    hints: KeyboardHint[];
    className?: string;
}

// VSCode-style keyboard hints panel for desktop
export function KeyboardHints({ hints, className }: KeyboardHintsProps) {
    if (hints.length === 0) return null;

    // Split hints into columns of max 4 items each
    const maxPerColumn = 4;
    const columns: KeyboardHint[][] = [];
    for (let i = 0; i < hints.length; i += maxPerColumn) {
        columns.push(hints.slice(i, i + maxPerColumn));
    }

    return (
        <div
            className={clsx(
                // Desktop only
                "hidden sm:flex",
                // Centered within container
                "justify-center",
                // Margin top for spacing from content
                "mt-8",
                className
            )}
        >
            <div className="flex gap-12 px-6 py-4">
                {columns.map((column, colIndex) => (
                    <div key={colIndex} className="flex flex-col gap-2">
                        {column.map((hint, index) => (
                            <div key={index} className="flex items-center justify-between gap-8">
                                <span className="text-sm text-zinc-500">{hint.label}</span>
                                <div className="flex items-center gap-1">
                                    {hint.keys.map((key, keyIndex) => (
                                        <span key={keyIndex} className="flex items-center">
                                            {keyIndex > 0 && (
                                                <span className="text-zinc-600 text-xs mx-1">+</span>
                                            )}
                                            <kbd
                                                className={clsx(
                                                    "inline-flex items-center justify-center",
                                                    "min-w-[1.75rem] px-2 py-1",
                                                    "text-xs font-mono",
                                                    "bg-zinc-800",
                                                    "text-zinc-400",
                                                    "rounded",
                                                    "border-b-2 border-zinc-950"
                                                )}
                                            >
                                                {key}
                                            </kbd>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Spacer component - no longer needed since hints are in document flow
export function KeyboardHintsSpacer({ className }: { className?: string }) {
    return null;
}
