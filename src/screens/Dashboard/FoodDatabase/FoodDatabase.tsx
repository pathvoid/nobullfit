import useHelmet from "@hooks/useHelmet";
import { useLoaderData } from "react-router-dom";
import { useState, FormEvent } from "react";
import { SidebarLayout } from "@components/sidebar-layout";
import { Navbar, NavbarSection, NavbarSpacer } from "@components/navbar";
import { Logo } from "@components/logo";
import { Heading } from "@components/heading";
import { Text } from "@components/text";
import { Input } from "@components/input";
import { Button } from "@components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/table";
import { Link } from "@components/link";
import {
    Pagination,
    PaginationGap,
    PaginationList,
    PaginationNext,
    PaginationPage,
    PaginationPrevious
} from "@components/pagination";
import DashboardSidebar, { UserDropdown } from "../DashboardSidebar";

// Types for OpenFoodFacts API response
interface OFFFood {
    foodId: string;
    label: string;
    knownAs?: string;
    nutrients: {
        ENERC_KCAL?: number;
        PROCNT?: number;
        FAT?: number;
        CHOCDF?: number;
    };
    brand?: string;
    category?: string;
    categoryLabel?: string;
    foodContentsLabel?: string;
    image?: string;
}

interface OFFHint {
    food: OFFFood;
    measures: Array<{
        uri: string;
        label: string;
        weight: number;
    }>;
}

interface OFFResponse {
    text: string;
    count: number;
    parsed: Array<{
        food: OFFFood;
    }>;
    hints: OFFHint[];
    _links?: {
        next?: {
            href: string;
            title: string;
        };
    };
}

const FoodDatabase: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[]; user?: unknown };
    const helmet = useHelmet();

    // Set helmet values
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<OFFResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [nextUrl, setNextUrl] = useState<string | null>(null);
    const [originalQuery, setOriginalQuery] = useState<string>("");
    const [totalCount, setTotalCount] = useState<number | null>(null);

    const handleSearch = async (e: FormEvent, offset?: number) => {
        e.preventDefault();
        
        if (!searchQuery.trim() && offset === undefined) {
            return;
        }

        setIsSearching(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.append("query", originalQuery || searchQuery.trim());
            if (offset !== undefined) {
                params.append("offset", offset.toString());
            }
            params.append("limit", "20");

            const response = await fetch(`/api/food-database/search?${params.toString()}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to search food database");
            }

            const data: OFFResponse = await response.json();
            setSearchResults(data);
            
            // Update pagination state
            if (offset !== undefined && offset > 0) {
                // Calculate page from offset
                setCurrentPage(Math.floor(offset / 20) + 1);
            } else {
                // New search, reset pagination and store original query and total count
                setCurrentPage(1);
                setOriginalQuery(searchQuery.trim());
                setTotalCount(data.count);
            }
            
            setNextUrl(data._links?.next?.href || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
            setSearchResults(null);
        } finally {
            setIsSearching(false);
        }
    };

    const handleNextPage = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (nextUrl) {
            // Calculate offset from current page
            const newOffset = currentPage * 20;
            await handleSearch(e as unknown as FormEvent, newOffset);
        }
    };

    const handlePreviousPage = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (originalQuery && currentPage > 1) {
            // Calculate offset for previous page
            const newOffset = (currentPage - 2) * 20;
            await handleSearch(e as unknown as FormEvent, newOffset);
        }
    };

    const renderPagination = () => {
        if (!searchResults || searchResults.hints.length === 0) {
            return null;
        }

        const hasNext = !!nextUrl;
        const hasPrevious = currentPage > 1;

        return (
            <Pagination>
                <span className="grow basis-0">
                    <Button 
                        plain 
                        aria-label="Previous page"
                        disabled={!hasPrevious}
                        onClick={handlePreviousPage}
                    >
                        <svg className="stroke-current" data-slot="icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path
                                d="M2.75 8H13.25M2.75 8L5.25 5.5M2.75 8L5.25 10.5"
                                strokeWidth={1.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        Previous
                    </Button>
                </span>
                <PaginationList>
                    <PaginationPage href="#" current>
                        {currentPage}
                    </PaginationPage>
                </PaginationList>
                <span className="flex grow basis-0 justify-end">
                    <Button 
                        plain 
                        aria-label="Next page"
                        disabled={!hasNext}
                        onClick={handleNextPage}
                    >
                        Next
                        <svg className="stroke-current" data-slot="icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path
                                d="M13.25 8L2.75 8M13.25 8L10.75 10.5M13.25 8L10.75 5.5"
                                strokeWidth={1.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </Button>
                </span>
            </Pagination>
        );
    };

    return (
        <SidebarLayout
            navbar={
                <Navbar>
                    <Logo className="text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
                    <NavbarSpacer />
                    <NavbarSection>
                        <UserDropdown />
                    </NavbarSection>
                </Navbar>
            }
            sidebar={<DashboardSidebar currentPath="/dashboard/food-database" />}
        >
            <div className="space-y-8">
                <div>
                    <Heading level={1}>Food Database</Heading>
                    <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                        Browse and search the food database.
                    </Text>
                </div>

                <form onSubmit={handleSearch} className="space-y-4">
                    <div className="flex gap-4">
                        <Input
                            type="text"
                            placeholder="Search for food (e.g., apple, chicken, pasta)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1"
                            disabled={isSearching}
                        />
                        <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
                            {isSearching ? "Searching..." : "Search"}
                        </Button>
                    </div>
                </form>

                {error && (
                    <div className="rounded-lg border border-red-500/20 bg-red-50 p-4 dark:bg-red-950/10">
                        <Text className="text-red-600 dark:text-red-400">{error}</Text>
                    </div>
                )}

                {searchResults && (
                    <div className="space-y-4">
                        {searchResults.hints.length > 0 ? (
                            <>
                                <div className="overflow-x-auto">
                                    <div className="inline-block min-w-full align-middle">
                                        <div className="overflow-hidden">
                                            <Table>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableHeader className="min-w-[250px]">Food Name</TableHeader>
                                                        <TableHeader className="hidden sm:table-cell min-w-[150px]">Brand</TableHeader>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {searchResults.hints.map((hint, index) => (
                                                        <TableRow key={`${hint.food.foodId}-${index}`}>
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    <Link 
                                                                        href={`/dashboard/food-database/${encodeURIComponent(hint.food.foodId)}`}
                                                                        className="shrink-0"
                                                                    >
                                                                        <img
                                                                            src={hint.food.image || "https://cdn.nobull.fit/no-image-no-text.jpg"}
                                                                            alt={hint.food.label}
                                                                            className="h-12 w-12 rounded-md object-cover"
                                                                        />
                                                                    </Link>
                                                                    <div className="flex flex-col gap-1 min-w-0">
                                                                        <Link 
                                                                            href={`/dashboard/food-database/${encodeURIComponent(hint.food.foodId)}`}
                                                                            className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                                                                        >
                                                                            {hint.food.label}
                                                                        </Link>
                                                                        {hint.food.knownAs && (
                                                                            <div className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 whitespace-normal">
                                                                                {hint.food.knownAs}
                                                                            </div>
                                                                        )}
                                                                        <div className="sm:hidden text-sm text-zinc-600 dark:text-zinc-400">
                                                                            {hint.food.brand || (
                                                                                <span className="text-zinc-400 dark:text-zinc-500">—</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="hidden sm:table-cell">
                                                                {hint.food.brand || (
                                                                    <span className="text-zinc-400 dark:text-zinc-500">—</span>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </div>
                                {renderPagination()}
                            </>
                        ) : (
                            <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/50">
                                <Text className="text-zinc-600 dark:text-zinc-400">
                                    No results found. Try a different search term.
                                </Text>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </SidebarLayout>
    );
};

export default FoodDatabase;
