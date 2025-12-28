import clsx from "clsx";
import { Link } from "./link";

// Logo component - displays NoBullFit branding
export function Logo({ className, href = "/", ...props }: { className?: string; href?: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} className={clsx(className, "text-xl font-semibold")} {...props}>
      NoBullFit
    </Link>
  );
}
