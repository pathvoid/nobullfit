import * as Headless from "@headlessui/react";
import clsx from "clsx";
import { forwardRef, ReactNode } from "react";
import { Button } from "./button";

interface InputWithButtonProps {
  inputProps: Omit<Headless.InputProps, "as" | "className"> & {
    className?: string;
    type?:
    | "email"
    | "number"
    | "password"
    | "search"
    | "tel"
    | "text"
    | "url"
    | "date"
    | "datetime-local"
    | "month"
    | "time"
    | "week";
  };
  buttonProps: React.ComponentPropsWithoutRef<typeof Button>;
  buttonContent: ReactNode;
  className?: string;
}

// Component that groups an Input with a button on the right side (inside the input)
export const InputWithButton = forwardRef<
  HTMLInputElement,
  InputWithButtonProps
>(function InputWithButton(
  { inputProps, buttonProps, buttonContent, className },
  ref
) {
  const { className: inputClassName, ...restInputProps } = inputProps;

  return (
    <span
      data-slot="control"
      className={clsx([
        className,
        // Basic layout
        "relative block w-full",
        // Background color + shadow applied to inset pseudo element, so shadow blends with border in light mode
        "before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)] before:bg-white before:shadow-sm",
        // Background color is moved to control and shadow is removed in dark mode so hide `before` pseudo
        "dark:before:hidden",
        // Focus ring
        "after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset sm:focus-within:after:ring-2 sm:focus-within:after:ring-blue-500",
        // Disabled state
        "has-data-disabled:opacity-50 has-data-disabled:before:bg-zinc-950/5 has-data-disabled:before:shadow-none"
      ])}
    >
      <Headless.Input
        ref={ref}
        {...restInputProps}
        className={clsx([
          inputClassName,
          // Basic layout
          "relative block w-full appearance-none rounded-lg px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)]",
          // Right padding to make room for the button
          "pr-12",
          // Typography
          "text-base/6 text-zinc-950 placeholder:text-zinc-500 sm:text-sm/6 dark:text-white",
          // Border
          "border border-zinc-950/10 data-hover:border-zinc-950/20 dark:border-white/10 dark:data-hover:border-white/20",
          // Background color
          "bg-transparent dark:bg-white/5",
          // Hide default focus styles
          "focus:outline-hidden",
          // Invalid state
          "data-invalid:border-red-500 data-invalid:data-hover:border-red-500 dark:data-invalid:border-red-600 dark:data-invalid:data-hover:border-red-600",
          // Disabled state
          "data-disabled:border-zinc-950/20 dark:data-disabled:border-white/15 dark:data-disabled:bg-white/2.5 dark:data-hover:data-disabled:border-white/15",
          // System icons
          "dark:scheme-dark"
        ])}
      />
      <div className="absolute inset-y-0 right-0 z-10 flex items-center pr-1.5">
        <Button
          {...buttonProps}
          className={clsx(
            buttonProps.className,
            // Style button to be clearly visible inside the input
            "h-7 px-2 text-sm border-0"
          )}
        >
          {buttonContent}
        </Button>
      </div>
    </span>
  );
});
