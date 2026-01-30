import { Badge } from "@components/badge";
import { Button } from "@components/button";
import { Checkbox, CheckboxField } from "@components/checkbox";
import { Field, Label } from "@components/fieldset";
import { Heading } from "@components/heading";
import { InputWithButton } from "@components/input-with-button";
import { Logo } from "@components/logo";
import { Navbar, NavbarSection, NavbarSpacer } from "@components/navbar";
import {
    Pagination,
    PaginationGap,
    PaginationList
} from "@components/pagination";
import { SidebarLayout } from "@components/sidebar-layout";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@components/table";
import { Text } from "@components/text";
import { useAuth } from "@core/contexts/AuthContext";
import useHelmet from "@hooks/useHelmet";
import { RECIPE_TAGS, getAllTags, type RecipeTagKey } from "@utils/recipeTags";
import { Filter, X } from "lucide-react";
import { FormEvent, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLoaderData, useLocation, useNavigate, useNavigationType, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import DashboardSidebar, { UserDropdown } from "../DashboardSidebar";

const FiltersPanel = memo<{
  hasActiveFilters: boolean;
  clearFilters: () => void;
  user: any;
  myRecipes: boolean;
  verified: boolean;
  tags: RecipeTagKey[];
  onMyRecipesChange: (checked: boolean) => void;
  onVerifiedChange: (checked: boolean) => void;
  onTagToggle: (tag: RecipeTagKey) => void;
  allTags: { key: RecipeTagKey; label: string }[];
}>(
  ({ hasActiveFilters, clearFilters, user, myRecipes, verified, tags, onMyRecipesChange, onVerifiedChange, onTagToggle, allTags }) => {
    return (
      <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/50">
        <div className="mb-4 flex items-center justify-between">
          <Heading level={3} className="text-lg">
            Filters
          </Heading>
          {hasActiveFilters && (
            <Button
              onClick={clearFilters}
              outline
              className="flex items-center gap-1 text-sm"
            >
              <X className="size-4" />
              Clear All
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {user && (
            <CheckboxField>
              <Checkbox
                checked={myRecipes}
                onChange={onMyRecipesChange}
              />
              <Label>Show only my recipes</Label>
            </CheckboxField>
          )}

          <CheckboxField>
            <Checkbox
              checked={verified}
              onChange={onVerifiedChange}
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
                  onClick={() => onTagToggle(key)}
                  className={`rounded-md px-3 py-1 text-sm transition-colors ${
                    tags.includes(key)
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
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if the actual filter values change
    return (
      prevProps.myRecipes === nextProps.myRecipes &&
      prevProps.verified === nextProps.verified &&
      prevProps.tags.length === nextProps.tags.length &&
      prevProps.tags.every((tag, i) => tag === nextProps.tags[i]) &&
      prevProps.hasActiveFilters === nextProps.hasActiveFilters &&
      prevProps.user?.id === nextProps.user?.id
    );
  }
);

interface Recipe {
  id: number;
  name: string;
  description: string | null;
  image_filename: string | null;
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
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigationType = useNavigationType();
  const isInitialMount = useRef(true);
  const [isRestoring, setIsRestoring] = useState(false);
  // Ref to track when we should actually perform a search (user clicked Search or changed page)
  const shouldSearch = useRef(false);

  // Set helmet values
  helmet.setTitle(loaderData.title);
  helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

  const MIN_SEARCH_LENGTH = 3;
  const RECIPES_PER_PAGE = 20;

  // Initialize filter state from URL params (for SSR compatibility)
  const [filterState, setFilterState] = useState(() => {
    const searchParam = searchParams.get("q") || "";
    const tagsParam = searchParams.get("tags") || "";
    const verifiedParam = searchParams.get("verified") === "true";
    const myRecipesParam = searchParams.get("myRecipes") === "true";
    const pageParam = parseInt(searchParams.get("page") || "1", 10);

    const parsedTags = tagsParam
      ? (tagsParam.split(",").filter((tag) =>
          Object.keys(RECIPE_TAGS).includes(tag)
        ) as RecipeTagKey[])
      : [];

    const validPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

    return {
      search: searchParam,
      tags: parsedTags,
      verified: verifiedParam,
      myRecipes: myRecipesParam,
      page: validPage
    };
  });

  // Restore from sessionStorage after hydration and when returning to page
  useLayoutEffect(() => {
    // Helper to check if filters have valid search criteria
    const hasValidSearchCriteria = (filters: typeof filterState) =>
      filters.search.length >= MIN_SEARCH_LENGTH || filters.myRecipes;

    // Skip on initial mount to avoid hydration mismatch
    if (isInitialMount.current) {
      // But do restore if there are no URL params (navigated back)
      const hasUrlParams = searchParams.toString().length > 0;
      if (!hasUrlParams && typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('recipeFilters');
        if (stored) {
          try {
            setIsRestoring(true);
            const parsedFilters = JSON.parse(stored);
            setFilterState(parsedFilters);
            // Trigger search if restored filters have valid criteria
            if (hasValidSearchCriteria(parsedFilters)) {
              shouldSearch.current = true;
            }
            // Use queueMicrotask to ensure state update completes first, then allow saves
            queueMicrotask(() => {
              setIsRestoring(false);
              isInitialMount.current = false;
            });
            return;
          } catch (e) {
            setIsRestoring(false);
            isInitialMount.current = false;
            // If parsing fails, keep default state
          }
        }
      }
      // No restoration needed, allow saves now
      isInitialMount.current = false;
      return;
    }

    // On subsequent navigations, check if it's a back/forward navigation
    if (navigationType === 'POP') {
      const hasUrlParams = searchParams.toString().length > 0;

      // Only restore from sessionStorage if there are no URL params
      if (!hasUrlParams && typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('recipeFilters');
        if (stored) {
          try {
            setIsRestoring(true);
            const parsedFilters = JSON.parse(stored);
            setFilterState(parsedFilters);
            // Trigger search if restored filters have valid criteria
            if (hasValidSearchCriteria(parsedFilters)) {
              shouldSearch.current = true;
            }
            // Use queueMicrotask to ensure state update completes first
            queueMicrotask(() => {
              setIsRestoring(false);
            });
          } catch (e) {
            setIsRestoring(false);
            // If parsing fails, keep default state
          }
        }
      }
    }
  }, [location.key, searchParams, navigationType]); // Run on every navigation

  const [searchQuery, setSearchQuery] = useState(filterState.search);
  const [isSearching, setIsSearching] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);

  // Save filter state to sessionStorage whenever it changes (but not during restoration)
  useEffect(() => {
    // Don't save while restoration is in progress
    if (isRestoring) {
      return;
    }

    // Don't save on initial mount before any restoration attempt
    if (isInitialMount.current) {
      return;
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('recipeFilters', JSON.stringify(filterState));
    }
  }, [filterState, isRestoring]);

  // Sync search input with filter state
  useEffect(() => {
    setSearchQuery(filterState.search);
  }, [filterState.search]);


  // Update filter state (stored in sessionStorage, no URL changes)
  const updateFilters = useCallback(
    (updates: {
      search?: string;
      tags?: RecipeTagKey[];
      verified?: boolean;
      myRecipes?: boolean;
      page?: number;
    }) => {
      setFilterState((current: typeof filterState) => ({
        ...current,
        ...updates
      }));
    },
    []
  );

  // Load recipes based on filter state
  const loadRecipes = useCallback(async () => {
    // Don't load if no valid search criteria (myRecipes allows empty search)
    const canSearch = filterState.search.length >= MIN_SEARCH_LENGTH || filterState.myRecipes;
    if (!canSearch) return;

    // Use a timeout to delay showing loading state for fast responses
    let showLoadingTimeout: NodeJS.Timeout | null = null;
    let isCompleted = false;

    showLoadingTimeout = setTimeout(() => {
      if (!isCompleted) {
        setIsSearching(true);
      }
    }, 150);

    try {
      const params = new URLSearchParams();

      if (filterState.search.trim()) {
        params.append("search", filterState.search.trim());
      }

      if (filterState.tags.length > 0) {
        params.append("tags", filterState.tags.join(","));
      }

      if (filterState.verified) {
        params.append("verified", "true");
      }

      if (filterState.myRecipes && user) {
        params.append("myRecipes", "true");
      }

      // Add pagination parameters
      params.append("page", String(filterState.page));
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
      toast.error("Failed to load recipes. Please try again.");
    } finally {
      isCompleted = true;
      if (showLoadingTimeout) {
        clearTimeout(showLoadingTimeout);
      }
      setIsSearching(false);
    }
  }, [filterState, user]);

  // Load recipes only when explicitly triggered (search button or page change)
  useEffect(() => {
    if (shouldSearch.current) {
      // Only reset the flag and search if we have valid criteria
      // This handles the case where the flag is set before filterState is updated
      const canSearch = filterState.search.length >= MIN_SEARCH_LENGTH || filterState.myRecipes;
      if (canSearch) {
        shouldSearch.current = false;
        loadRecipes();
      }
    }
  }, [filterState, loadRecipes]);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    // Require minimum characters for search (unless myRecipes filter is active)
    if (!filterState.myRecipes && searchQuery.trim().length < MIN_SEARCH_LENGTH) {
      return;
    }
    // Set flag to trigger search, then update filter state
    shouldSearch.current = true;
    updateFilters({ search: searchQuery.trim(), page: 1 });
  };

  const toggleTag = (tag: RecipeTagKey) => {
    const newTags = filterState.tags.includes(tag)
      ? filterState.tags.filter((t: RecipeTagKey) => t !== tag)
      : [...filterState.tags, tag];
    updateFilters({ tags: newTags, page: 1 });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setRecipes([]);
    setPagination(null);
    updateFilters({ search: "", tags: [], verified: false, myRecipes: false, page: 1 });
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('recipeFilters');
    }
  };

  const handlePageChange = (page: number) => {
    shouldSearch.current = true;
    updateFilters({ page });
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasActiveFilters = Boolean(
    filterState.search.trim() ||
    filterState.tags.length > 0 ||
    filterState.verified ||
    filterState.myRecipes
  );

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

  // Memoize allTags to prevent FiltersPanel from re-rendering unnecessarily
  const allTags = useMemo(() => getAllTags(), []);

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
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="flex gap-2 flex-1">
              <InputWithButton
                inputProps={{
                  type: "text",
                  placeholder: "Search recipes by name or description...",
                  value: searchQuery,
                  onChange: (e) => setSearchQuery(e.target.value),
                  minLength: MIN_SEARCH_LENGTH
                }}
                buttonProps={{
                  type: "button",
                  onClick: () => setShowFilters(!showFilters),
                  outline: true,
                  className: "flex items-center gap-1",
                  "aria-label": "Filter"
                }}
                buttonContent={
                  <>
                    <Filter className="size-4" />
                    {hasActiveFilters && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                        {(filterState.search.trim() ? 1 : 0) +
                          filterState.tags.length +
                          (filterState.verified ? 1 : 0) +
                          (filterState.myRecipes ? 1 : 0)}
                      </span>
                    )}
                  </>
                }
              />
              <Button
                type="submit"
                disabled={
                  isSearching ||
                  (searchQuery.trim().length < MIN_SEARCH_LENGTH &&
                    !filterState.myRecipes)
                }
                title={
                  searchQuery.trim().length < MIN_SEARCH_LENGTH &&
                  !filterState.myRecipes
                    ? `Enter at least ${MIN_SEARCH_LENGTH} characters to search`
                    : undefined
                }
              >
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>
            <Button
              onClick={() => navigate("/dashboard/recipe-database/create")}
              outline
              className="w-full sm:w-auto whitespace-nowrap"
            >
              Create Recipe
            </Button>
          </form>

          <div style={{ display: showFilters ? 'block' : 'none' }}>
            <FiltersPanel
              hasActiveFilters={hasActiveFilters}
              clearFilters={clearFilters}
              user={user}
              myRecipes={filterState.myRecipes}
              verified={filterState.verified}
              tags={filterState.tags}
              onMyRecipesChange={(checked) => updateFilters({ myRecipes: checked, page: 1 })}
              onVerifiedChange={(checked) => updateFilters({ verified: checked, page: 1 })}
              onTagToggle={toggleTag}
              allTags={allTags}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Text className="text-sm text-zinc-600 dark:text-zinc-400">
              Active filters: {hasActiveFilters ? null : "None"}
            </Text>
            {filterState.search.trim() && (
              <Badge color="zinc">Search: {filterState.search}</Badge>
            )}
            {filterState.myRecipes && <Badge color="blue">My Recipes</Badge>}
            {filterState.verified && <Badge color="green">Verified</Badge>}
            {filterState.tags.map((tag: RecipeTagKey) => (
              <Badge key={tag} color="zinc">
                {RECIPE_TAGS[tag]}
              </Badge>
            ))}
          </div>
        </div>

        {!(filterState.search.length >= MIN_SEARCH_LENGTH || filterState.myRecipes) ? (
          <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-12 text-center dark:border-white/10 dark:bg-zinc-800/50">
            <img
              src="https://cdn.nobull.fit/cooking-pot.png"
              alt="Search for recipes"
              className="mx-auto h-48 w-48 object-contain"
            />
            <Heading level={2} className="mt-4">
              Search for Recipes
            </Heading>
            <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
              Enter a search term or check "Show only my recipes" to find
              recipes from the NoBullFit community.
            </Text>
          </div>
        ) : sortedRecipes.length === 0 && !isSearching ? (
          <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-12 text-center dark:border-white/10 dark:bg-zinc-800/50">
            <img
              src="https://cdn.nobull.fit/cooking-pot.png"
              alt="No recipes found"
              className="mx-auto h-48 w-48 object-contain"
            />
            <Heading level={2} className="mt-4">
              No Recipes Found
            </Heading>
            <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
              Try adjusting your search or filters to find more recipes.
            </Text>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader className="min-w-50">
                        Recipe Name
                      </TableHeader>
                      <TableHeader className="hidden md:table-cell min-w-75">
                        Description
                      </TableHeader>
                      <TableHeader className="min-w-30">Tags</TableHeader>
                      <TableHeader className="hidden sm:table-cell min-w-37.5">
                        Author
                      </TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedRecipes.map((recipe) => {
                      const isMyRecipe = user && recipe.user_id === user.id;
                      return (
                        <TableRow key={recipe.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Link
                                to={`/dashboard/recipe-database/${recipe.id}`}
                                className="shrink-0"
                              >
                                <img
                                  src={
                                    recipe.image_filename
                                      ? recipe.image_filename.startsWith("http")
                                        ? recipe.image_filename
                                        : `https://cdn.nobull.fit/recipes/${recipe.image_filename}`
                                      : "https://cdn.nobull.fit/no-image-no-text.jpg"
                                  }
                                  alt={recipe.name}
                                  className="h-12 w-12 rounded-md object-cover"
                                />
                              </Link>
                              <div className="flex flex-col gap-1 min-w-0">
                                <div className="inline-flex items-center gap-2 flex-wrap">
                                  <Link
                                    to={`/dashboard/recipe-database/${recipe.id}`}
                                    className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline truncate"
                                  >
                                    {recipe.name}
                                  </Link>
                                  {recipe.is_verified && (
                                    <Badge
                                      color="green"
                                      className="text-xs shrink-0"
                                    >
                                      Verified
                                    </Badge>
                                  )}
                                  {isMyRecipe && (
                                    <Badge
                                      color="blue"
                                      className="text-xs shrink-0"
                                    >
                                      Mine
                                    </Badge>
                                  )}
                                </div>
                                <div className="md:hidden text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3 whitespace-normal">
                                  {recipe.description || (
                                    <span className="text-zinc-400 dark:text-zinc-500">
                                      —
                                    </span>
                                  )}
                                </div>
                                <div className="sm:hidden text-sm text-zinc-600 dark:text-zinc-400">
                                  By {recipe.author_name}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell align-top">
                            <div className="max-w-lg">
                              <Text className="line-clamp-3 whitespace-normal">
                                {recipe.description || (
                                  <span className="text-zinc-400 dark:text-zinc-500">
                                    —
                                  </span>
                                )}
                              </Text>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {recipe.tags && recipe.tags.length > 0 ? (
                                recipe.tags.slice(0, 3).map((tag) => (
                                  <Badge
                                    key={tag}
                                    color="zinc"
                                    className="text-xs"
                                  >
                                    {RECIPE_TAGS[tag]}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-zinc-400 dark:text-zinc-500 text-sm">
                                  —
                                </span>
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
                disabled={filterState.page === 1}
                onClick={() => {
                  if (filterState.page > 1) {
                    handlePageChange(filterState.page - 1);
                  }
                }}
              >
                <svg
                  className="stroke-current"
                  data-slot="icon"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
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
                const current = filterState.page;

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
                        i === current
                          ? "before:bg-zinc-950/5 dark:before:bg-white/10"
                          : ""
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
                disabled={filterState.page >= pagination.totalPages}
                onClick={() => {
                  if (filterState.page < pagination.totalPages) {
                    handlePageChange(filterState.page + 1);
                  }
                }}
              >
                Next
                <svg
                  className="stroke-current"
                  data-slot="icon"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
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
