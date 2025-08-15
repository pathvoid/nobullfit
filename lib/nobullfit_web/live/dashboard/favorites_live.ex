defmodule NobullfitWeb.Dashboard.FavoritesLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.CoreComponents
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]
  import NobullfitWeb.Components.Sidebar, only: [sidebar: 1]
  import NobullfitWeb.Layouts, only: [flash_group: 1]

  on_mount {NobullfitWeb.UserAuth, :require_authenticated}

  @impl true
  def mount(_params, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})

    # For now, we'll use placeholder data until we implement the actual favorites functionality
    favorite_foods = []
    favorite_recipes = []

    {:ok,
     assign(socket,
       page_title: "Favorites",
       current_path: "/d/favorites",
       maintenance_status: maintenance_status,
       favorite_foods: favorite_foods,
       favorite_recipes: favorite_recipes,
       active_tab: "foods", # "foods" or "recipes"
       loading: false
     )}
  end

  @impl true
  def handle_event("switch_tab", %{"tab" => tab}, socket) do
    {:noreply, assign(socket, active_tab: tab)}
  end

  @impl true
  def handle_event("remove_favorite_food", %{"food_id" => _food_id}, socket) do
    # TODO: Implement remove favorite food functionality
    {:noreply, socket}
  end

  @impl true
  def handle_event("remove_favorite_recipe", %{"recipe_id" => _recipe_id}, socket) do
    # TODO: Implement remove favorite recipe functionality
    {:noreply, socket}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-base-100 flex flex-col">
      <.navigation current_scope={@current_scope} current_path={@current_path} maintenance_status={@maintenance_status} />

      <div class="flex flex-1">
        <.sidebar current_path={@current_path} />

        <div class="flex-1">
          <main class="px-4 py-8 md:py-12">
            <div class="max-w-6xl mx-auto space-y-8">
              <.header centered={true}>
                Favorites
                <:subtitle>Your saved foods and recipes for quick access</:subtitle>
              </.header>

              <!-- Tab Navigation -->
              <div class="flex justify-center">
                <div class="tabs tabs-boxed">
                  <button
                    class={["tab", if(@active_tab == "foods", do: "tab-active")]}
                    phx-click="switch_tab"
                    phx-value-tab="foods"
                  >
                    Foods
                    <span class="badge badge-sm badge-primary ml-2">{length(@favorite_foods)}</span>
                  </button>
                  <button
                    class={["tab", if(@active_tab == "recipes", do: "tab-active")]}
                    phx-click="switch_tab"
                    phx-value-tab="recipes"
                  >
                    Recipes
                    <span class="badge badge-sm badge-primary ml-2">{length(@favorite_recipes)}</span>
                  </button>
                </div>
              </div>

              <!-- Content Area -->
              <div class="space-y-6">
                <%= if @active_tab == "foods" do %>
                  <!-- Favorite Foods Tab -->
                  <div class="space-y-6">
                    <%= if length(@favorite_foods) == 0 do %>
                      <!-- Empty State for Foods -->
                      <div class="text-center py-12">
                        <div class="max-w-md mx-auto">
                          <div class="mb-6">
                            <svg class="w-16 h-16 mx-auto text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                            </svg>
                          </div>
                          <h3 class="text-lg font-semibold mb-2">No favorite foods yet</h3>
                          <p class="text-base-content/70 mb-6">
                            When you add foods to your favorites from the Food Database, they'll appear here for quick access.
                          </p>
                          <a href="/d/food-database" class="btn btn-primary">
                            Browse Food Database
                          </a>
                        </div>
                      </div>
                    <% else %>
                      <!-- Favorite Foods Grid -->
                      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <%= for food <- @favorite_foods do %>
                          <div class="card bg-base-200 shadow-sm hover:shadow-md transition-shadow">
                            <div class="card-body">
                              <div class="flex justify-between items-start mb-3">
                                <h3 class="card-title text-lg">{food.name}</h3>
                                <button
                                  class="btn btn-ghost btn-sm text-error"
                                  phx-click="remove_favorite_food"
                                  phx-value-food_id={food.id}
                                >
                                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                                  </svg>
                                </button>
                              </div>

                              <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                  <span class="text-base-content/70">Calories:</span>
                                  <span class="font-medium">{food.calories} kcal</span>
                                </div>
                                <div class="flex justify-between">
                                  <span class="text-base-content/70">Protein:</span>
                                  <span class="font-medium">{food.protein}g</span>
                                </div>
                                <div class="flex justify-between">
                                  <span class="text-base-content/70">Carbs:</span>
                                  <span class="font-medium">{food.carbs}g</span>
                                </div>
                                <div class="flex justify-between">
                                  <span class="text-base-content/70">Fat:</span>
                                  <span class="font-medium">{food.fat}g</span>
                                </div>
                              </div>

                              <div class="card-actions justify-end mt-4">
                                <a href={"/d/nutrition-info/#{food.id}/#{URI.encode(food.name)}/100"} class="btn btn-primary btn-sm">
                                  View Details
                                </a>
                                <button class="btn btn-secondary btn-sm">
                                  Add to Food Log
                                </button>
                              </div>
                            </div>
                          </div>
                        <% end %>
                      </div>
                    <% end %>
                  </div>
                <% else %>
                  <!-- Favorite Recipes Tab -->
                  <div class="space-y-6">
                    <%= if length(@favorite_recipes) == 0 do %>
                      <!-- Empty State for Recipes -->
                      <div class="text-center py-12">
                        <div class="max-w-md mx-auto">
                          <div class="mb-6">
                            <svg class="w-16 h-16 mx-auto text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                            </svg>
                          </div>
                          <h3 class="text-lg font-semibold mb-2">No favorite recipes yet</h3>
                          <p class="text-base-content/70 mb-6">
                            When you add recipes to your favorites from the Recipe Database, they'll appear here for quick access.
                          </p>
                          <a href="/d/recipe-database" class="btn btn-primary">
                            Browse Recipe Database
                          </a>
                        </div>
                      </div>
                    <% else %>
                      <!-- Favorite Recipes Grid -->
                      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <%= for recipe <- @favorite_recipes do %>
                          <div class="card bg-base-200 shadow-sm hover:shadow-md transition-shadow">
                            <%= if recipe.image do %>
                              <figure class="px-4 pt-4">
                                <img src={recipe.image} alt={recipe.label} class="rounded-lg h-48 w-full object-cover" />
                              </figure>
                            <% end %>
                            <div class="card-body">
                              <div class="flex justify-between items-start mb-3">
                                <h3 class="card-title text-lg">{recipe.label}</h3>
                                <button
                                  class="btn btn-ghost btn-sm text-error"
                                  phx-click="remove_favorite_recipe"
                                  phx-value-recipe_id={recipe.id}
                                >
                                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                                  </svg>
                                </button>
                              </div>

                              <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                  <span class="text-base-content/70">Calories:</span>
                                  <span class="font-medium">{recipe.calories} kcal</span>
                                </div>
                                <div class="flex justify-between">
                                  <span class="text-base-content/70">Servings:</span>
                                  <span class="font-medium">{recipe.servings}</span>
                                </div>
                                <div class="flex justify-between">
                                  <span class="text-base-content/70">Time:</span>
                                  <span class="font-medium">{recipe.time} min</span>
                                </div>
                                <%= if recipe.diet_labels && length(recipe.diet_labels) > 0 do %>
                                  <div class="flex flex-wrap gap-1 mt-2">
                                    <%= for label <- Enum.take(recipe.diet_labels, 3) do %>
                                      <span class="badge badge-outline badge-sm">{label}</span>
                                    <% end %>
                                  </div>
                                <% end %>
                              </div>

                              <div class="card-actions justify-end mt-4">
                                <a href={recipe.url} target="_blank" class="btn btn-primary btn-sm">
                                  View Recipe
                                </a>
                                <button class="btn btn-secondary btn-sm">
                                  Add to Grocery List
                                </button>
                              </div>
                            </div>
                          </div>
                        <% end %>
                      </div>
                    <% end %>
                  </div>
                <% end %>
              </div>
            </div>
          </main>
        </div>
      </div>

      <.footer current_path={@current_path} />
      <.flash_group flash={@flash} />
    </div>
    """
  end
end
