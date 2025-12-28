// Auth layout component - centered layout for authentication pages
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col bg-white dark:bg-zinc-900">
      <div className="flex grow items-center justify-center p-4 lg:p-8">
        {children}
      </div>
    </main>
  );
}
