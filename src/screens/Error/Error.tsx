import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { Heading } from "@components/heading";
import { Button } from "@components/button";
import { Text } from "@components/text";

// Error page component - handles various HTTP errors (405, 500, etc.)
const Error: React.FC = () => {
    const error = useRouteError();
    
    // Determine error status and message
    let status = 500;
    let title = "Internal Server Error";
    let message = "Something went wrong. Please try again later or contact support if the problem persists.";

    if (isRouteErrorResponse(error)) {
        status = error.status;
        
        switch (status) {
            case 405:
                title = "Method Not Allowed";
                message = "The request method is not allowed for this resource. Please check your request and try again.";
                break;
            case 403:
                title = "Forbidden";
                message = "You don't have permission to access this resource.";
                break;
            case 401:
                title = "Unauthorized";
                message = "You need to be authenticated to access this resource.";
                break;
            case 500:
                title = "Internal Server Error";
                message = "Something went wrong on our end. Please try again later or contact support if the problem persists.";
                break;
            case 503:
                title = "Service Unavailable";
                message = "The service is temporarily unavailable. Please try again later.";
                break;
            default:
                title = `Error ${status}`;
                message = error.statusText || "An error occurred. Please try again later.";
        }
    } else if (error && typeof error === "object" && "message" in error) {
        title = "Error";
        message = (error as { message?: string }).message || "An unexpected error occurred.";
    }

    return (
        <main className="flex min-h-dvh flex-col items-center justify-center bg-white p-2 dark:bg-zinc-900">
            <div className="mx-auto max-w-md text-center">
                <div className="mb-8">
                    <Heading level={1} className="text-9xl font-bold text-zinc-200 dark:text-zinc-800">
                        {status}
                    </Heading>
                </div>
                <Heading level={2} className="mb-4">
                    {title}
                </Heading>
                <Text className="mb-8 text-lg text-zinc-600 dark:text-zinc-400">
                    {message}
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

export default Error;

