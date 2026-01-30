import useHelmet from "@hooks/useHelmet";
import { useLoaderData, useLocation, useNavigationType } from "react-router-dom";
import { useState, FormEvent, useLayoutEffect, useRef, useEffect } from "react";
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
import { toast } from "sonner";

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

// Type for saved search state
interface SavedFoodSearchState {
    searchQuery: string;
    originalQuery: string;
    currentPage: number;
    totalCount: number | null;
    nextUrl: string | null;
}

const FoodDatabase: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[]; user?: unknown };
    const helmet = useHelmet();
    const location = useLocation();
    const navigationType = useNavigationType();
    const isInitialMount = useRef(true);
    const shouldSearch = useRef(false);

    // Set helmet values
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    const MIN_SEARCH_LENGTH = 3;

    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<OFFResponse | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [nextUrl, setNextUrl] = useState<string | null>(null);
    const [originalQuery, setOriginalQuery] = useState<string>("");
    const [totalCount, setTotalCount] = useState<number | null>(null);

    // Restore search state from sessionStorage on mount or back navigation
    useLayoutEffect(() => {
        if (isInitialMount.current || navigationType === 'POP') {
            if (typeof window !== 'undefined') {
                const stored = sessionStorage.getItem('foodSearchState');
                if (stored) {
                    try {
                        const parsedState: SavedFoodSearchState = JSON.parse(stored);
                        setSearchQuery(parsedState.searchQuery);
                        setOriginalQuery(parsedState.originalQuery);
                        setCurrentPage(parsedState.currentPage);
                        setTotalCount(parsedState.totalCount);
                        setNextUrl(parsedState.nextUrl);
                        // Trigger search to restore results if query meets minimum length
                        if (parsedState.originalQuery && parsedState.originalQuery.length >= MIN_SEARCH_LENGTH) {
                            shouldSearch.current = true;
                        }
                    } catch (e) {
                        // If parsing fails, keep default state
                    }
                }
            }
            isInitialMount.current = false;
        }
    }, [location.key, navigationType]);

    // Save search state to sessionStorage whenever it changes
    useEffect(() => {
        if (isInitialMount.current) return;
        if (!originalQuery) return; // Don't save if no search has been performed

        if (typeof window !== 'undefined') {
            const stateToSave: SavedFoodSearchState = {
                searchQuery,
                originalQuery,
                currentPage,
                totalCount,
                nextUrl
            };
            sessionStorage.setItem('foodSearchState', JSON.stringify(stateToSave));
        }
    }, [searchQuery, originalQuery, currentPage, totalCount, nextUrl]);

    // Core search function that can be called programmatically
    const performSearch = async (query: string, offset?: number, isNewSearch: boolean = false) => {
        if (query.trim().length < MIN_SEARCH_LENGTH) return;

        setIsSearching(true);

        try {
            const params = new URLSearchParams();
            params.append("query", query.trim());
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
            } else if (isNewSearch) {
                // New search, reset pagination and store original query and total count
                setCurrentPage(1);
                setOriginalQuery(query.trim());
                setTotalCount(data.count);
            }

            setNextUrl(data._links?.next?.href || null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "An error occurred");
            setSearchResults(null);
        } finally {
            setIsSearching(false);
        }
    };

    // Trigger search when shouldSearch flag is set (on restore)
    useEffect(() => {
        if (shouldSearch.current && originalQuery && originalQuery.length >= MIN_SEARCH_LENGTH) {
            shouldSearch.current = false;
            // Calculate offset from current page
            const offset = currentPage > 1 ? (currentPage - 1) * 20 : undefined;
            performSearch(originalQuery, offset);
        }
    }, [originalQuery, currentPage]);

    const handleSearch = async (e: FormEvent) => {
        e.preventDefault();

        if (searchQuery.trim().length < MIN_SEARCH_LENGTH) {
            return;
        }

        await performSearch(searchQuery, undefined, true);
    };

    const handleNextPage = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (nextUrl && originalQuery) {
            // Calculate offset from current page
            const newOffset = currentPage * 20;
            await performSearch(originalQuery, newOffset);
        }
    };

    const handlePreviousPage = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (originalQuery && currentPage > 1) {
            // Calculate offset for previous page
            const newOffset = (currentPage - 2) * 20;
            await performSearch(originalQuery, newOffset);
        }
    };

    const clearSearch = () => {
        setSearchQuery("");
        setSearchResults(null);
        setCurrentPage(1);
        setNextUrl(null);
        setOriginalQuery("");
        setTotalCount(null);
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('foodSearchState');
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
                    <Logo href="/dashboard" className="text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
                    <NavbarSpacer />
                    <NavbarSection>
                        <UserDropdown />
                    </NavbarSection>
                </Navbar>
            }
            sidebar={<DashboardSidebar currentPath="/dashboard/food-database" />}
        >
            <div className="space-y-6">
                <div>
                    <Heading level={1}>Food Database</Heading>
                    <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                        Browse and search the food database.
                    </Text>
                </div>

                <form onSubmit={handleSearch} className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            placeholder="Search for food (e.g., apple, chicken, pasta)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1"
                            disabled={isSearching}
                        />
                        <Button
                            type="submit"
                            disabled={isSearching || searchQuery.trim().length < MIN_SEARCH_LENGTH}
                            title={
                                searchQuery.trim().length < MIN_SEARCH_LENGTH
                                    ? `Enter at least ${MIN_SEARCH_LENGTH} characters to search`
                                    : undefined
                            }
                        >
                            {isSearching ? "Searching..." : "Search"}
                        </Button>
                        {(searchQuery || searchResults) && (
                            <Button
                                type="button"
                                outline
                                onClick={clearSearch}
                                disabled={isSearching}
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                </form>

                {!searchResults && !isSearching ? (
                    <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-12 text-center dark:border-white/10 dark:bg-zinc-800/50">
                        <img
                            src="https://cdn.nobull.fit/pantry.png"
                            alt="Search for food"
                            className="mx-auto h-48 w-48 object-contain"
                        />
                        <Heading level={2} className="mt-4">
                            Search for Food
                        </Heading>
                        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                            Enter a search term to find food items from our database.
                        </Text>
                    </div>
                ) : searchResults && searchResults.hints.length === 0 ? (
                    <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-12 text-center dark:border-white/10 dark:bg-zinc-800/50">
                        <img
                            src="https://cdn.nobull.fit/pantry.png"
                            alt="No food found"
                            className="mx-auto h-48 w-48 object-contain"
                        />
                        <Heading level={2} className="mt-4">
                            No Results Found
                        </Heading>
                        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                            We couldn't find any food items matching your search. Try a different search term.
                        </Text>
                    </div>
                ) : searchResults && searchResults.hints.length > 0 ? (
                    <div className="space-y-4">
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
                                                                    onError={(e) => {
                                                                        e.currentTarget.src = "https://cdn.nobull.fit/no-image-no-text.jpg";
                                                                    }}
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
                    </div>
                ) : null}
            </div>
        </SidebarLayout>
    );
};

export default FoodDatabase;
