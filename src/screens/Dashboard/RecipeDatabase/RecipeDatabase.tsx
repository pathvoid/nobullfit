import useHelmet from "@hooks/useHelmet";
import { useLoaderData, Link, useNavigate } from "react-router-dom";
import { useState, FormEvent, useEffect, useCallback } from "react";
import { SidebarLayout } from "@components/sidebar-layout";
import { Navbar, NavbarSection, NavbarSpacer } from "@components/navbar";
import { Logo } from "@components/logo";
import { Heading } from "@components/heading";
import { Text } from "@components/text";
import { Input } from "@components/input";
import { Button } from "@components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/table";
import { Checkbox, CheckboxField, CheckboxGroup } from "@components/checkbox";
import { Badge } from "@components/badge";
import { Field, Label } from "@components/fieldset";
import { Pagination, PaginationGap, PaginationList, PaginationNext, PaginationPage, PaginationPrevious } from "@components/pagination";
import { Search, Filter, X } from "lucide-react";
import DashboardSidebar, { UserDropdown } from "../DashboardSidebar";
import { useAuth } from "@core/contexts/AuthContext";
import { RECIPE_TAGS, getAllTags, type RecipeTagKey } from "@utils/recipeTags";

interface Recipe {
    id: number;
    name: string;
    description: string | null;
    tags?: RecipeTagKey[];
    is_public: boolean;
    is_verified?: boolean;
    author_name: string;
    user_id: number;
    created_at: string;
    updated_at: string;
}

const RecipeDatabase: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const helmet = useHelmet();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Set helmet values
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    const [searchQuery, setSearchQuery] = useState("");
    const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedTags, setSelectedTags] = useState<RecipeTagKey[]>([]);
    const [verifiedOnly, setVerifiedOnly] = useState(false);
    const [myRecipesOnly, setMyRecipesOnly] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState<{
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    } | null>(null);
    
    const RECIPES_PER_PAGE = 20;

    // Load recipes with current filters (preserving applied search query)
    const loadRecipes = useCallback(async () => {
        setIsSearching(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            
            // Use the applied search query, not the current input value
            if (appliedSearchQuery.trim()) {
                params.append("search", appliedSearchQuery.trim());
            }
            
            if (selectedTags.length > 0) {
                params.append("tags", selectedTags.join(","));
            }
            
            if (verifiedOnly) {
                params.append("verified", "true");
            }
            
            if (myRecipesOnly && user) {
                params.append("myRecipes", "true");
            }

            // Add pagination parameters
            params.append("page", String(currentPage));
            params.append("limit", String(RECIPES_PER_PAGE));

            const response = await fetch(`/api/recipes?${params.toString()}`, {
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error("Failed to load recipes");
            }

            const data = await response.json();
            setRecipes(data.recipes || []);
            setPagination(data.pagination || null);
        } catch (err) {
            console.error("Error loading recipes:", err);
            setError("Failed to load recipes. Please try again.");
        } finally {
            setIsSearching(false);
        }
    }, [appliedSearchQuery, selectedTags, verifiedOnly, myRecipesOnly, user, currentPage]);

    // Load recipes on mount and when filters change (preserving applied search query)
    useEffect(() => {
        loadRecipes();
    }, [loadRecipes]);

    // Reset to page 1 when filters change (except page changes)
    useEffect(() => {
        setCurrentPage(1);
    }, [appliedSearchQuery, selectedTags, verifiedOnly, myRecipesOnly]);

    const handleSearch = async (e: FormEvent) => {
        e.preventDefault();
        setCurrentPage(1); // Reset to first page on new search
        setAppliedSearchQuery(searchQuery);
        // loadRecipes will be called automatically via useEffect when appliedSearchQuery changes
    };

    const toggleTag = (tag: RecipeTagKey) => {
        setSelectedTags(prev => 
            prev.includes(tag) 
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    const clearFilters = () => {
        setSearchQuery("");
        setAppliedSearchQuery("");
        setSelectedTags([]);
        setVerifiedOnly(false);
        setMyRecipesOnly(false);
        setCurrentPage(1);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        // Scroll to top when page changes
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const hasActiveFilters = appliedSearchQuery.trim() || selectedTags.length > 0 || verifiedOnly || myRecipesOnly;

    // Sort recipes: user's recipes first, then verified, then by date
    const sortedRecipes = [...recipes].sort((a, b) => {
        if (user) {
            const aIsMine = a.user_id === user.id;
            const bIsMine = b.user_id === user.id;
            if (aIsMine && !bIsMine) return -1;
            if (!aIsMine && bIsMine) return 1;
        }
        
        if (a.is_verified && !b.is_verified) return -1;
        if (!a.is_verified && b.is_verified) return 1;
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const allTags = getAllTags();

    return (
        <SidebarLayout
            navbar={
                <Navbar>
                    <Logo className="h-6 text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
                    <NavbarSpacer />
                    <NavbarSection>
                        <UserDropdown />
                    </NavbarSection>
                </Navbar>
            }
            sidebar={<DashboardSidebar currentPath="/dashboard/recipe-database" />}
        >
            <div className="space-y-6">
                <div>
                    <Heading level={1}>Recipe Database</Heading>
                    <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                        Browse and search recipes created by the NoBullFit community.
                    </Text>
                </div>

                <div className="space-y-4">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-zinc-400" />
                            <Input
                                type="text"
                                placeholder="Search recipes by name or description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                type="button"
                                onClick={() => setShowFilters(!showFilters)}
                                outline
                                className="flex items-center gap-2"
                            >
                                <Filter className="size-4" />
                                Filters
                                {hasActiveFilters && (
                                    <span className="ml-1 rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                                        {(appliedSearchQuery.trim() ? 1 : 0) + selectedTags.length + (verifiedOnly ? 1 : 0) + (myRecipesOnly ? 1 : 0)}
                                    </span>
                                )}
                            </Button>
                            <Button type="submit" disabled={isSearching}>
                                {isSearching ? "Searching..." : "Search"}
                            </Button>
                            <Button 
                                onClick={() => navigate("/dashboard/recipe-database/create")} 
                                outline
                                className="whitespace-nowrap"
                            >
                                Create Recipe
                            </Button>
                        </div>
                    </form>

                    {showFilters && (
                        <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/50">
                            <div className="mb-4 flex items-center justify-between">
                                <Heading level={3} className="text-lg">Filters</Heading>
                                {hasActiveFilters && (
                                    <Button onClick={clearFilters} outline className="flex items-center gap-1 text-sm">
                                        <X className="size-4" />
                                        Clear All
                                    </Button>
                                )}
                            </div>
                            
                            <div className="space-y-4">
                                {user && (
                                    <CheckboxField>
                                        <Checkbox
                                            checked={myRecipesOnly}
                                            onChange={setMyRecipesOnly}
                                        />
                                        <Label>Show only my recipes</Label>
                                    </CheckboxField>
                                )}

                                <CheckboxField>
                                    <Checkbox
                                        checked={verifiedOnly}
                                        onChange={setVerifiedOnly}
                                    />
                                    <Label>Verified recipes only</Label>
                                </CheckboxField>

                                <Field>
                                    <Label>Tags</Label>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {allTags.map(({ key, label }) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => toggleTag(key)}
                                                className={`rounded-md px-3 py-1 text-sm transition-colors ${
                                                    selectedTags.includes(key)
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </Field>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                            Active filters: {hasActiveFilters ? null : "None"}
                        </Text>
                        {appliedSearchQuery.trim() && (
                            <Badge color="zinc">Search: {appliedSearchQuery}</Badge>
                        )}
                        {myRecipesOnly && (
                            <Badge color="blue">My Recipes</Badge>
                        )}
                        {verifiedOnly && (
                            <Badge color="green">Verified</Badge>
                        )}
                        {selectedTags.map(tag => (
                            <Badge key={tag} color="zinc">{RECIPE_TAGS[tag]}</Badge>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="rounded-lg border border-red-500/20 bg-red-50 p-4 dark:bg-red-950/10">
                        <Text className="text-red-600 dark:text-red-400">{error}</Text>
                    </div>
                )}

                {sortedRecipes.length === 0 && !isSearching ? (
                    <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-12 text-center dark:border-white/10 dark:bg-zinc-800/50">
                        <img 
                            src="https://cdn.nobull.fit/cooking-pot.png" 
                            alt="No recipes found" 
                            className="mx-auto h-48 w-48 object-contain"
                        />
                        <Heading level={2} className="mt-4">
                            {hasActiveFilters ? "No Recipes Found" : "No Recipes Yet"}
                        </Heading>
                        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                            {hasActiveFilters
                                ? "Try adjusting your filters to find more recipes."
                                : "Be the first to create a recipe and share it with the NoBullFit community!"}
                        </Text>
                    </div>
                ) : (
                    <div className="overflow-x-auto -mx-6 sm:mx-0">
                        <div className="inline-block min-w-full align-middle">
                            <div className="overflow-hidden ring-1 ring-zinc-950/5 dark:ring-white/10">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableHeader className="min-w-[200px]">Recipe Name</TableHeader>
                                            <TableHeader className="hidden md:table-cell min-w-[300px]">Description</TableHeader>
                                            <TableHeader className="min-w-[120px]">Tags</TableHeader>
                                            <TableHeader className="hidden sm:table-cell min-w-[150px]">Author</TableHeader>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {sortedRecipes.map((recipe) => {
                                            const isMyRecipe = user && recipe.user_id === user.id;
                                            return (
                                                <TableRow key={recipe.id}>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <div className="inline-flex items-center gap-2">
                                                                <Link
                                                                    to={`/dashboard/recipe-database/${recipe.id}`}
                                                                    className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                                                                >
                                                                    {recipe.name}
                                                                </Link>
                                                                {recipe.is_verified && (
                                                                    <Badge color="green" className="text-xs">
                                                                        Verified
                                                                    </Badge>
                                                                )}
                                                                {isMyRecipe && (
                                                                    <Badge color="blue" className="text-xs">
                                                                        Mine
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="md:hidden text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                                                                {recipe.description || (
                                                                    <span className="text-zinc-400 dark:text-zinc-500">—</span>
                                                                )}
                                                            </div>
                                                            <div className="sm:hidden text-sm text-zinc-600 dark:text-zinc-400">
                                                                By {recipe.author_name}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell">
                                                        <div className="max-w-md">
                                                            <Text className="line-clamp-2">
                                                                {recipe.description || (
                                                                    <span className="text-zinc-400 dark:text-zinc-500">—</span>
                                                                )}
                                                            </Text>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {recipe.tags && recipe.tags.length > 0 ? (
                                                                recipe.tags.slice(0, 3).map((tag) => (
                                                                    <Badge key={tag} color="zinc" className="text-xs">
                                                                        {RECIPE_TAGS[tag]}
                                                                    </Badge>
                                                                ))
                                                            ) : (
                                                                <span className="text-zinc-400 dark:text-zinc-500 text-sm">—</span>
                                                            )}
                                                            {recipe.tags && recipe.tags.length > 3 && (
                                                                <Badge color="zinc" className="text-xs">
                                                                    +{recipe.tags.length - 3}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="hidden sm:table-cell">
                                                        {recipe.author_name}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                )}

                {pagination && pagination.totalPages > 1 && (
                    <Pagination>
                        <span className="grow basis-0">
                            <Button 
                                plain 
                                aria-label="Previous page"
                                disabled={currentPage === 1}
                                onClick={() => {
                                    if (currentPage > 1) {
                                        handlePageChange(currentPage - 1);
                                    }
                                }}
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
                            {(() => {
                                const pages: React.ReactNode[] = [];
                                const totalPages = pagination.totalPages;
                                const current = currentPage;
                                
                                // Always show first page
                                if (current > 3) {
                                    pages.push(
                                        <Button
                                            key={1}
                                            plain
                                            aria-label="Page 1"
                                            onClick={() => handlePageChange(1)}
                                            className="min-w-9 before:absolute before:-inset-px before:rounded-lg"
                                        >
                                            <span className="-mx-0.5">1</span>
                                        </Button>
                                    );
                                    if (current > 4) {
                                        pages.push(<PaginationGap key="gap-start" />);
                                    }
                                }
                                
                                // Show pages around current page
                                const start = Math.max(1, current - 2);
                                const end = Math.min(totalPages, current + 2);
                                
                                for (let i = start; i <= end; i++) {
                                    pages.push(
                                        <Button
                                            key={i}
                                            plain
                                            aria-label={`Page ${i}`}
                                            aria-current={i === current ? "page" : undefined}
                                            onClick={() => handlePageChange(i)}
                                            className={`min-w-9 before:absolute before:-inset-px before:rounded-lg ${
                                                i === current ? "before:bg-zinc-950/5 dark:before:bg-white/10" : ""
                                            }`}
                                        >
                                            <span className="-mx-0.5">{i}</span>
                                        </Button>
                                    );
                                }
                                
                                // Always show last page
                                if (current < totalPages - 2) {
                                    if (current < totalPages - 3) {
                                        pages.push(<PaginationGap key="gap-end" />);
                                    }
                                    pages.push(
                                        <Button
                                            key={totalPages}
                                            plain
                                            aria-label={`Page ${totalPages}`}
                                            onClick={() => handlePageChange(totalPages)}
                                            className="min-w-9 before:absolute before:-inset-px before:rounded-lg"
                                        >
                                            <span className="-mx-0.5">{totalPages}</span>
                                        </Button>
                                    );
                                }
                                
                                return pages;
                            })()}
                        </PaginationList>
                        <span className="flex grow basis-0 justify-end">
                            <Button 
                                plain 
                                aria-label="Next page"
                                disabled={currentPage >= pagination.totalPages}
                                onClick={() => {
                                    if (currentPage < pagination.totalPages) {
                                        handlePageChange(currentPage + 1);
                                    }
                                }}
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
                )}
            </div>
        </SidebarLayout>
    );
};

export default RecipeDatabase;
