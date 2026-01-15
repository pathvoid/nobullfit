"use client";

import * as Headless from "@headlessui/react";
import { useState } from "react";
import { useSwipeable } from "react-swipeable";
import { NavbarItem } from "./navbar";
import { X } from "lucide-react";
import { MaintenanceBanner } from "./maintenance-banner";

// CSS-based hamburger menu icon to avoid SVG rendering artifacts
function HamburgerIcon({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`flex h-6 w-6 flex-col items-center justify-center gap-1 ${className || ""}`}
      {...props}
    >
      <span className="h-0.5 w-4 rounded-full bg-current" />
      <span className="h-0.5 w-4 rounded-full bg-current" />
      <span className="h-0.5 w-4 rounded-full bg-current" />
    </span>
  );
}

// Mobile sidebar component - slide-out sidebar for mobile devices
function MobileSidebar({ open, close, children }: React.PropsWithChildren<{ open: boolean; close: () => void }>) {
  return (
    <Headless.Dialog open={open} onClose={close} className="lg:hidden">
      <Headless.DialogBackdrop
        transition
        className="fixed inset-0 bg-black/30 transition data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />
      <Headless.DialogPanel
        transition
        className="fixed inset-y-0 w-full max-w-80 p-2 transition duration-300 ease-in-out data-closed:-translate-x-full"
      >
        <div className="flex h-full flex-col rounded-lg bg-white shadow-xs ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
          <div className="-mb-3 px-4 pt-3">
            <Headless.CloseButton as={NavbarItem} aria-label="Close navigation">
              <X data-slot="icon" />
            </Headless.CloseButton>
          </div>
          {children}
        </div>
      </Headless.DialogPanel>
    </Headless.Dialog>
  );
}

// Sidebar layout component - layout with fixed sidebar on desktop, mobile drawer
export function SidebarLayout({
  navbar,
  sidebar,
  children
}: React.PropsWithChildren<{ navbar: React.ReactNode; sidebar: React.ReactNode }>) {
  const [showSidebar, setShowSidebar] = useState(false);

  // Swipe handler for mobile - opens sidebar when swiping right from left edge
  const swipeHandlers = useSwipeable({
    onSwipedRight: (eventData) => {
      // Only open if swipe started near the left edge (within 20px) and sidebar is closed
      if (!showSidebar && eventData.initial[0] < 20) {
        setShowSidebar(true);
      }
    },
    trackMouse: false, // Only track touch events
    preventScrollOnSwipe: false
  });

  return (
    <div className="relative isolate flex min-h-svh w-full flex-col bg-white lg:bg-zinc-100 dark:bg-zinc-900 dark:lg:bg-zinc-950">
      {/* Maintenance banner - appears at very top */}
      <MaintenanceBanner />
      
      <div className="flex flex-1 max-lg:flex-col">
        {/* Sidebar on desktop - top offset accounts for maintenance banner */}
        <div className="fixed left-0 w-64 max-lg:hidden" style={{ top: "var(--maintenance-banner-height, 0px)", bottom: 0 }}>{sidebar}</div>

        {/* Sidebar on mobile */}
        <MobileSidebar open={showSidebar} close={() => setShowSidebar(false)}>
          {sidebar}
        </MobileSidebar>

        {/* Navbar on mobile - sticky header below banner */}
        <header 
          className="sticky z-50 flex items-center px-4 bg-white dark:bg-zinc-900 lg:hidden"
          style={{ top: "var(--maintenance-banner-height, 0px)" }}
        >
          <div className="py-2.5 mr-3">
            <NavbarItem onClick={() => setShowSidebar(true)} aria-label="Open navigation">
              <HamburgerIcon data-slot="icon" />
            </NavbarItem>
          </div>
          <div className="min-w-0 flex-1">{navbar}</div>
        </header>

        {/* Content - swipeable on mobile */}
        <main className="flex flex-1 flex-col pb-2 lg:min-w-0 lg:pt-2 lg:pr-2 lg:pl-64" {...swipeHandlers}>
          <div className="grow p-6 lg:rounded-lg lg:bg-white lg:p-10 lg:shadow-xs lg:ring-1 lg:ring-zinc-950/5 dark:lg:bg-zinc-900 dark:lg:ring-white/10">
            <div className="mx-auto max-w-6xl">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
