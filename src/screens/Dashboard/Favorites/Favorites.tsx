import useHelmet from "@hooks/useHelmet";
import { useLoaderData } from "react-router-dom";
import { useState } from "react";
import { SidebarLayout } from "@components/sidebar-layout";
import { Navbar, NavbarSection, NavbarSpacer } from "@components/navbar";
import { Logo } from "@components/logo";
import { Heading } from "@components/heading";
import { Text } from "@components/text";
import { Button } from "@components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/table";
import { Link } from "@components/link";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownLabel } from "@components/dropdown";
import { MoreVertical, Trash2 } from "lucide-react";
import DashboardSidebar, { UserDropdown } from "../DashboardSidebar";

interface Favorite {
    id: number;
    food_id: string;
    food_label: string;
    food_data?: {
        brand?: string;
        category?: string;
        categoryLabel?: string;
        image?: string;
        image_filename?: string;
    };
    item_type: string;
    created_at: string;
}

const Favorites: React.FC = () => {
    const loaderData = useLoaderData() as { 
        title: string; 
        meta: unknown[]; 
        favorites?: Favorite[];
        error?: string;
    };
    const helmet = useHelmet();
    const [favorites, setFavorites] = useState<Favorite[]>(loaderData.favorites || []);
    const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());

    // Set helmet values
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    const handleRemoveFavorite = async (favorite: Favorite) => {
        setRemovingIds(prev => new Set(prev).add(favorite.id));
        
        try {
            const response = await fetch(`/api/favorites/${encodeURIComponent(favorite.food_id)}?itemType=${favorite.item_type}`, {
                method: "DELETE",
                credentials: "include"
            });

            if (response.ok) {
                setFavorites(prev => prev.filter(f => f.id !== favorite.id));
            }
        } catch (error) {
            console.error("Error removing favorite:", error);
        } finally {
            setRemovingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(favorite.id);
                return newSet;
            });
        }
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
            sidebar={<DashboardSidebar currentPath="/dashboard/favorites" />}
        >
            <div className="space-y-8">
                <div>
                    <Heading level={1}>Favorites</Heading>
                    <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                        Your favorite items will appear here.
                    </Text>
                </div>

                {loaderData.error && (
                    <div className="rounded-lg border border-red-500/20 bg-red-50 p-4 dark:bg-red-950/10">
                        <Text className="text-red-600 dark:text-red-400">{loaderData.error}</Text>
                    </div>
                )}

                {favorites.length === 0 ? (
                    <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-12 text-center dark:border-white/10 dark:bg-zinc-800/50">
                        <img 
                            src="https://cdn.nobull.fit/apple-heart.png" 
                            alt="No favorites" 
                            className="mx-auto h-48 w-48 object-contain"
                        />
                        <Heading level={2} className="mt-4">
                            No Favorites Yet
                        </Heading>
                        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                            Start adding favorites from the Food Database or Recipe Database to see them here!
                        </Text>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Text className="text-zinc-600 dark:text-zinc-400">
                            {favorites.length} favorite{favorites.length !== 1 ? "s" : ""}
                        </Text>
                        <div className="overflow-x-auto">
                            <div className="inline-block min-w-full align-middle">
                                <div className="overflow-hidden">
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableHeader className="min-w-[250px]">Name</TableHeader>
                                                <TableHeader className="hidden sm:table-cell min-w-[80px]">Type</TableHeader>
                                                <TableHeader className="hidden md:table-cell min-w-[120px]">Brand</TableHeader>
                                                <TableHeader className="min-w-[100px] text-right"></TableHeader>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {favorites.map((favorite) => {
                                                const isRecipe = favorite.item_type === "recipe";
                                                const detailUrl = isRecipe 
                                                    ? `/dashboard/recipe-database/${encodeURIComponent(favorite.food_id)}`
                                                    : `/dashboard/food-database/${encodeURIComponent(favorite.food_id)}`;
                                                
                                                // Get thumbnail image
                                                let thumbnailUrl = "https://cdn.nobull.fit/no-image-no-text.jpg";
                                                if (isRecipe && favorite.food_data?.image_filename) {
                                                    thumbnailUrl = `https://cdn.nobull.fit/recipes/${favorite.food_data.image_filename}`;
                                                } else if (!isRecipe && favorite.food_data?.image) {
                                                    thumbnailUrl = favorite.food_data.image;
                                                }
                                                
                                                return (
                                                    <TableRow key={favorite.id}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <Link 
                                                                    href={detailUrl}
                                                                    className="shrink-0"
                                                                >
                                                                    <img
                                                                        src={thumbnailUrl}
                                                                        alt={favorite.food_label}
                                                                        className="h-12 w-12 rounded-md object-cover"
                                                                        onError={(e) => {
                                                                            e.currentTarget.src = "https://cdn.nobull.fit/no-image-no-text.jpg";
                                                                        }}
                                                                    />
                                                                </Link>
                                                                <div className="flex flex-col gap-1 min-w-0">
                                                                    <Link 
                                                                        href={detailUrl}
                                                                        className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                                                                    >
                                                                        {favorite.food_label}
                                                                    </Link>
                                                                    <div className="md:hidden text-sm text-zinc-600 dark:text-zinc-400">
                                                                        {!isRecipe && favorite.food_data?.brand && (
                                                                            <span>{favorite.food_data.brand}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="hidden sm:table-cell">
                                                            {isRecipe ? (
                                                                <span className="text-purple-600 dark:text-purple-400">Recipe</span>
                                                            ) : (
                                                                <span className="text-green-600 dark:text-green-400">Food</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="hidden md:table-cell">
                                                            {!isRecipe && (favorite.food_data?.brand || (
                                                                <span className="text-zinc-400 dark:text-zinc-500">—</span>
                                                            ))}
                                                            {isRecipe && (
                                                                <span className="text-zinc-400 dark:text-zinc-500">—</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end">
                                                                <Dropdown>
                                                                    <DropdownButton 
                                                                        plain
                                                                        className="p-2"
                                                                        aria-label="Favorite options"
                                                                    >
                                                                        <MoreVertical className="h-5 w-5" />
                                                                    </DropdownButton>
                                                                    <DropdownMenu anchor="bottom end" className="min-w-40">
                                                                        <DropdownItem 
                                                                            onClick={() => handleRemoveFavorite(favorite)}
                                                                            disabled={removingIds.has(favorite.id)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" data-slot="icon" />
                                                                            <DropdownLabel>
                                                                                {removingIds.has(favorite.id) ? "Removing..." : "Remove"}
                                                                            </DropdownLabel>
                                                                        </DropdownItem>
                                                                    </DropdownMenu>
                                                                </Dropdown>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </SidebarLayout>
    );
};

export default Favorites;
