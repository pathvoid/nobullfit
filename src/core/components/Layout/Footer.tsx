import { Link } from "@components/link";
import { Text } from "@components/text";

// Footer component - site footer with links and copyright
const Footer: React.FC = () => {
    return (
        <footer className="mt-16 border-t border-zinc-950/10 py-8 dark:border-white/10">
            <div className="mx-auto max-w-6xl px-6">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                        <Link href="/refund-policy" className="text-sm font-medium text-zinc-950 hover:text-zinc-700 dark:text-white dark:hover:text-zinc-300">
                            Refund Policy
                        </Link>
                        <Link href="/terms-of-service" className="text-sm font-medium text-zinc-950 hover:text-zinc-700 dark:text-white dark:hover:text-zinc-300">
                            Terms of Service
                        </Link>
                        <Link href="/privacy-policy" className="text-sm font-medium text-zinc-950 hover:text-zinc-700 dark:text-white dark:hover:text-zinc-300">
                            Privacy Policy
                        </Link>
                    </div>
                    <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                        © {new Date().getFullYear()} NoBullFit. All rights reserved.
                    </Text>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
