import { Heading } from "@components/heading";
import { Button } from "@components/button";
import { Text } from "@components/text";

// 404 Not Found page component - uses Catalyst components without layout
const NotFound: React.FC = () => {
    return (
        <main className="flex min-h-dvh flex-col items-center justify-center bg-white p-2 dark:bg-zinc-900">
            <div className="mx-auto max-w-md text-center">
                <div className="mb-8">
                    <Heading level={1} className="text-9xl font-bold text-zinc-200 dark:text-zinc-800">
                        404
                    </Heading>
                </div>
                <Heading level={2} className="mb-4">
                    Page Not Found
                </Heading>
                <Text className="mb-8 text-lg text-zinc-600 dark:text-zinc-400">
                    The page you're looking for doesn't exist or has been moved. Please check the URL or return to the homepage.
                </Text>
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                    <Button href="/">
                        Go Home
                    </Button>
                    <Button href="/contact" outline>
                        Contact Us
                    </Button>
                </div>
            </div>
        </main>
    );
};

export default NotFound;