import { SidebarHeading, SidebarSection } from "@components/sidebar";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface CollapsibleSidebarSectionProps {
    title: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
    className?: string;
}

export function CollapsibleSidebarSection({ title, defaultOpen = false, children, className }: CollapsibleSidebarSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const prevDefaultOpenRef = useRef(defaultOpen);

    // Update state when defaultOpen changes (e.g., when navigating to a page in this section)
    useEffect(() => {
        if (prevDefaultOpenRef.current !== defaultOpen) {
            setIsOpen(defaultOpen);
            prevDefaultOpenRef.current = defaultOpen;
        }
    }, [defaultOpen]);

    const toggle = () => {
        setIsOpen((prev) => !prev);
    };

    return (
        <SidebarSection className={className}>
            <button
                onClick={toggle}
                className="group mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1 text-left -ml-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
                <SidebarHeading className="mb-0">{title}</SidebarHeading>
                {isOpen ? (
                    <ChevronUp className="size-4 shrink-0 text-zinc-500 group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-200" />
                ) : (
                    <ChevronDown className="size-4 shrink-0 text-zinc-500 group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-200" />
                )}
            </button>
            <div className={`ml-2 overflow-visible transition-all duration-200 ${isOpen ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden pointer-events-none"}`}>
                <div className="py-1">
                    {children}
                </div>
            </div>
        </SidebarSection>
    );
}
