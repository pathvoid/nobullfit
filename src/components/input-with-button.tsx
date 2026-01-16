import clsx from "clsx";
import { forwardRef, ReactNode } from "react";
import { Input } from "./input";
import { Button } from "./button";

interface InputWithButtonProps {
    inputProps: React.ComponentPropsWithoutRef<typeof Input>;
    buttonProps: React.ComponentPropsWithoutRef<typeof Button>;
    buttonContent: ReactNode;
    className?: string;
}

// Component that groups an Input with a button on the right side
export const InputWithButton = forwardRef<HTMLInputElement, InputWithButtonProps>(
    function InputWithButton({ inputProps, buttonProps, buttonContent, className }, ref) {
        return (
            <div className={clsx("relative isolate block w-full", className)}>
                <Input
                    {...inputProps}
                    ref={ref}
                    className={clsx(
                        inputProps.className,
                        // Add right padding to make room for the button
                        "pr-[calc(var(--spacing(10))+var(--spacing(2.5)))] sm:pr-[calc(var(--spacing(9))+var(--spacing(2.5)))]"
                    )}
                />
                <div className="absolute inset-y-0 right-0 flex items-center">
                    <Button
                        {...buttonProps}
                        className={clsx(
                            buttonProps.className,
                            "h-full py-0 px-2 shrink-0 rounded-l-none rounded-r-lg m-0 border-0 border-l-0"
                        )}
                    >
                        {buttonContent}
                    </Button>
                </div>
            </div>
        );
    }
);
