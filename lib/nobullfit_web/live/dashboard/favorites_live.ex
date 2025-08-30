defmodule NobullfitWeb.Dashboard.FavoritesLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.CoreComponents
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]
  import NobullfitWeb.Components.Sidebar, only: [sidebar: 1]
  import NobullfitWeb.Layouts, only: [flash_group: 1]

  on_mount {NobullfitWeb.UserAuth, :require_authenticated}

  alias Nobullfit.UserFavorites

  # Helper function to format decimal values
  defp format_decimal(value) when is_struct(value, Decimal) do
    Decimal.round(value, 2) |> Decimal.to_string()
  end

  # Helper function to calculate nutrition per 100g reference for foods
  defp calculate_per_100g_nutrition(food) do
    # Convert nutrition values to per 100g for comparison
    # food.quantity contains the serving size in grams
    proportion = 100.0 / food.quantity

    %{
      calories: if(food.calories, do: Float.round(food.calories * proportion, 2), else: nil),
      protein: if(food.protein, do: Float.round(Decimal.to_float(food.protein) * proportion, 2), else: nil),
      carbs: if(food.carbs, do: Float.round(Decimal.to_float(food.carbs) * proportion, 2), else: nil),
      fat: if(food.fat, do: Float.round(Decimal.to_float(food.fat) * proportion, 2), else: nil)
    }
  end

  # Helper function to calculate per-serving nutrition values for recipes
  defp calculate_per_serving_nutrition(recipe) do
    # Get the yield (number of servings) - default to 1 if not provided
    yield = recipe.yield || 1

    # The calories in favorites are already stored per serving, so no need to divide
    calories_per_serving = recipe.calories || 0

    # Calculate per-serving nutrients if available
    # Note: The totalNutrients in recipe_data are total values for the entire recipe,
    # so we need to divide by yield to get per-serving values
    nutrients_per_serving =
      if recipe.recipe_data && recipe.recipe_data["recipe"] && recipe.recipe_data["recipe"]["totalNutrients"] && yield > 0 do
        recipe.recipe_data["recipe"]["totalNutrients"]
        |> Enum.map(fn {key, nutrient} ->
          quantity =
            case nutrient["quantity"] do
              nil -> nil
              value when is_number(value) ->
                # Round to 2 decimal places
                Float.round(value / yield, 2)
              value ->
                case Float.parse("#{value}") do
                  {parsed_value, _} -> Float.round(parsed_value / yield, 2)
                  :error -> nil
                end
            end

          {key, %{nutrient | "quantity" => quantity}}
        end)
        |> Enum.into(%{})
      else
        %{}
      end

    %{
      calories: calories_per_serving,
      nutrients: nutrients_per_serving
    }
  end

  @impl true
  def mount(_params, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})
    user_id = socket.assigns.current_scope.user.id

    # Load user's favorites
    favorite_foods = UserFavorites.list_user_favorites(user_id, "food")
    favorite_recipes = UserFavorites.list_user_favorites(user_id, "recipe")

    {:ok,
      assign(socket,
        page_title: "Favorites",
        current_path: "/d/favorites",
        maintenance_status: maintenance_status,
        favorite_foods: favorite_foods,
        favorite_recipes: favorite_recipes,
        active_tab: "foods", # "foods" or "recipes"
        loading: false,
        show_delete_confirm: false,
        item_to_delete: nil,
        grocery_lists: [],
        show_grocery_menu: false,
        selected_recipe_index: nil,
        selected_food_index: nil,
        show_quantity_modal: false,
        selected_item_for_quantity: nil,
        quantity_value: "1",
        quantity_type: "servings",
        adjusted_nutrition: %{calories: nil, protein: nil, carbs: nil, fat: nil}
      )}
  end

  @impl true
  def handle_event("switch_tab", %{"tab" => tab}, socket) do
    {:noreply, assign(socket, active_tab: tab)}
  end

  @impl true
  def handle_event("show_delete_confirm", %{"id" => id, "type" => type}, socket) do
    item =
      case type do
        "food" -> Enum.find(socket.assigns.favorite_foods, fn f -> f.id == String.to_integer(id) end)
        "recipe" -> Enum.find(socket.assigns.favorite_recipes, fn r -> r.id == String.to_integer(id) end)
      end

    {:noreply, assign(socket, show_delete_confirm: true, item_to_delete: item)}
  end

  @impl true
  def handle_event("hide_delete_confirm", _params, socket) do
    {:noreply, assign(socket, show_delete_confirm: false, item_to_delete: nil)}
  end

  @impl true
  def handle_event("confirm_delete", _params, socket) do
    user_id = socket.assigns.current_scope.user.id
    item = socket.assigns.item_to_delete

    case UserFavorites.delete_user_favorite(item) do
      {:ok, _} ->
        # Reload favorites after deletion
        favorite_foods = UserFavorites.list_user_favorites(user_id, "food")
        favorite_recipes = UserFavorites.list_user_favorites(user_id, "recipe")

        {:noreply,
          socket
          |> assign(
            favorite_foods: favorite_foods,
            favorite_recipes: favorite_recipes,
            show_delete_confirm: false,
            item_to_delete: nil
          )
          |> put_flash(:info, "Removed from favorites")}

      {:error, _} ->
        {:noreply,
          socket
          |> assign(show_delete_confirm: false, item_to_delete: nil)
          |> put_flash(:error, "Failed to remove from favorites")}
    end
  end

  @impl true
  def handle_event("load_grocery_lists", %{"recipe-index" => recipe_index}, socket) do
    # Load user's grocery lists when dropdown is opened
    user_id = socket.assigns.current_scope.user.id
    grocery_lists = Nobullfit.GroceryLists.list_grocery_lists(user_id)

    if length(grocery_lists) > 0 do
      {:noreply,
        assign(socket,
          show_grocery_menu: true,
          selected_recipe_index: String.to_integer(recipe_index),
          grocery_lists: grocery_lists
        )}
    else
      {:noreply,
        socket
        |> put_flash(:error, "You need to create a grocery list first. Go to the Groceries page to create one.")
      }
    end
  end

  @impl true
  def handle_event("load_grocery_lists", %{"food-index" => food_index}, socket) do
    # Load user's grocery lists when dropdown is opened for food items
    user_id = socket.assigns.current_scope.user.id
    grocery_lists = Nobullfit.GroceryLists.list_grocery_lists(user_id)

    if length(grocery_lists) > 0 do
      {:noreply,
        assign(socket,
          show_grocery_menu: true,
          selected_food_index: String.to_integer(food_index),
          grocery_lists: grocery_lists
        )}
    else
      {:noreply,
        socket
        |> put_flash(:error, "You need to create a grocery list first. Go to the Groceries page to create one.")
      }
    end
  end

  @impl true
  def handle_event("show_grocery_menu", %{"recipe-index" => recipe_index}, socket) do
    # Load user's grocery lists when menu is opened
    user_id = socket.assigns.current_scope.user.id
    grocery_lists = Nobullfit.GroceryLists.list_grocery_lists(user_id)

    if length(grocery_lists) > 0 do
      {:noreply,
        assign(socket,
          show_grocery_menu: true,
          selected_recipe_index: String.to_integer(recipe_index),
          grocery_lists: grocery_lists
        )}
    else
      {:noreply,
        socket
        |> put_flash(:error, "You need to create a grocery list first. Go to the Groceries page to create one.")
      }
    end
  end

  @impl true
  def handle_event("show_grocery_menu", %{"food-index" => food_index}, socket) do
    # Load user's grocery lists when menu is opened for food items
    user_id = socket.assigns.current_scope.user.id
    grocery_lists = Nobullfit.GroceryLists.list_grocery_lists(user_id)

    if length(grocery_lists) > 0 do
      {:noreply,
        assign(socket,
          show_grocery_menu: true,
          selected_food_index: String.to_integer(food_index),
          grocery_lists: grocery_lists
        )}
    else
      {:noreply,
        socket
        |> put_flash(:error, "You need to create a grocery list first. Go to the Groceries page to create one.")
      }
    end
  end

  @impl true
  def handle_event("hide_grocery_menu", _params, socket) do
    {:noreply, assign(socket, show_grocery_menu: false, selected_recipe_index: nil, selected_food_index: nil)}
  end

  @impl true
  def handle_event("add_to_grocery_list", %{"list-id" => list_id}, socket) do
    if socket.assigns.selected_recipe_index && socket.assigns.selected_recipe_index < length(socket.assigns.favorite_recipes) do
      recipe = Enum.at(socket.assigns.favorite_recipes, socket.assigns.selected_recipe_index)

      # Check if recipe_data exists (for older favorites that might not have it)
      if recipe.recipe_data do
        # Extract ingredients from the stored recipe data
        ingredients = recipe.recipe_data["recipe"]["ingredients"] || []

        if length(ingredients) > 0 do
          case Nobullfit.GroceryLists.add_recipe_ingredients_to_list(String.to_integer(list_id), ingredients) do
            {:ok, _result} ->
              {:noreply,
                socket
                |> assign(show_grocery_menu: false, selected_recipe_index: nil)
                |> put_flash(:info, "Ingredients added to grocery list successfully!")}

            {:error, _error} ->
              {:noreply,
                socket
                |> assign(show_grocery_menu: false, selected_recipe_index: nil)
                |> put_flash(:error, "Failed to add ingredients to grocery list.")}
          end
        else
          {:noreply,
            socket
            |> assign(show_grocery_menu: false, selected_recipe_index: nil)
            |> put_flash(:error, "No ingredients found for this recipe.")}
        end
      else
        {:noreply,
          socket
          |> assign(show_grocery_menu: false, selected_recipe_index: nil)
          |> put_flash(:error, "Recipe ingredients not available. This favorite was saved before ingredients were stored. Please re-add the recipe to favorites from the Recipe Database.")}
      end
    else
      {:noreply, assign(socket, show_grocery_menu: false, selected_recipe_index: nil)}
    end
  end

  @impl true
  def handle_event("add_food_to_grocery_list", %{"list-id" => list_id}, socket) do
    if socket.assigns.selected_food_index && socket.assigns.selected_food_index < length(socket.assigns.favorite_foods) do
      food = Enum.at(socket.assigns.favorite_foods, socket.assigns.selected_food_index)

      # Create a grocery item from the food favorite
      item_params = %{
        "name" => food.name,
        "quantity" => "1",
        "grocery_list_id" => String.to_integer(list_id)
      }

      case Nobullfit.GroceryLists.add_item_to_list(String.to_integer(list_id), item_params) do
        {:ok, _grocery_item} ->
          {:noreply,
            socket
            |> assign(show_grocery_menu: false, selected_food_index: nil)
            |> put_flash(:info, "#{food.name} added to grocery list successfully!")}

        {:error, _changeset} ->
          {:noreply,
            socket
            |> assign(show_grocery_menu: false, selected_food_index: nil)
            |> put_flash(:error, "Failed to add #{food.name} to grocery list.")}
      end
    else
      {:noreply, assign(socket, show_grocery_menu: false, selected_food_index: nil)}
    end
  end

  @impl true
  def handle_event("add_to_food_log", %{"food-index" => food_index}, socket) do
    food_index_int = String.to_integer(food_index)
    if food_index_int < length(socket.assigns.favorite_foods) do
      food = Enum.at(socket.assigns.favorite_foods, food_index_int)

      # Get the default serving size from measures if available, otherwise use servings
      default_serving =
        if food.measures && length(food.measures) > 0 do
          first_measure = List.first(food.measures)
          "#{first_measure["weight"]}_#{first_measure["label"]}"
        else
          "servings"
        end

      # Calculate initial adjusted nutrition for 1 serving
      initial_nutrition = calculate_adjusted_nutrition(%{type: "food", item: food}, default_serving, "1")

      # Show quantity modal for food
      {:noreply,
        assign(socket,
          show_quantity_modal: true,
          selected_item_for_quantity: %{type: "food", index: food_index_int, item: food},
          quantity_value: "1",
          quantity_type: default_serving,
          adjusted_nutrition: initial_nutrition
        )}
    else
      {:noreply, socket}
    end
  end

  @impl true
  def handle_event("add_recipe_to_food_log", %{"recipe-index" => recipe_index}, socket) do
    recipe_index_int = String.to_integer(recipe_index)
    if recipe_index_int < length(socket.assigns.favorite_recipes) do
      recipe = Enum.at(socket.assigns.favorite_recipes, recipe_index_int)

      # Calculate initial adjusted nutrition for 1 serving
      initial_nutrition = calculate_adjusted_nutrition(%{type: "recipe", item: recipe}, "servings", "1")

      # Show quantity modal for recipe
      {:noreply,
        assign(socket,
          show_quantity_modal: true,
          selected_item_for_quantity: %{type: "recipe", index: recipe_index_int, item: recipe},
          quantity_value: "1",
          quantity_type: "servings",
          adjusted_nutrition: initial_nutrition
        )}
    else
      {:noreply, socket}
    end
  end

  @impl true
  def handle_event("hide_quantity_modal", _params, socket) do
    {:noreply,
      assign(socket,
        show_quantity_modal: false,
        selected_item_for_quantity: nil,
        quantity_value: "1",
        quantity_type: "servings"
      )}
  end

  @impl true
  def handle_event("confirm_quantity", _params, socket) do
    case socket.assigns.selected_item_for_quantity do
      %{type: "food", item: food} ->
        # Calculate adjusted nutrition values based on quantity
        quantity =
          case Float.parse(socket.assigns.quantity_value) do
            {value, _} -> value
            :error -> 1.0
          end

        # Parse the quantity type to get the base measurement and display text
        {base_quantity, display_text} =
          case socket.assigns.quantity_type do
            "grams" -> {1, "g"}  # For grams, use 1 as base since quantity is already in grams
            "servings" -> {food.quantity, "Servings (#{food.quantity}g)"}
            type_string ->
              case String.split(type_string, "_", parts: 2) do
                [qty_str, unit] ->
                  case Float.parse(qty_str) do
                    {qty, _} -> {qty, "#{unit} (#{qty_str}g)"}
                    :error -> {food.quantity, "g"}
                  end
                _ -> {food.quantity, "g"}
              end
          end

        # Calculate the total quantity in the selected unit
        adjusted_quantity = quantity * base_quantity

        # Calculate proportion for nutrition values (always based on grams)
        proportion = adjusted_quantity / food.quantity

        # Build query parameters with adjusted food data
        query_params = %{
          "food_name" => food.name,
          "calories" => if(food.calories, do: trunc(food.calories * proportion), else: ""),
          "protein" => if(food.protein, do: format_decimal(Decimal.mult(food.protein, Decimal.new("#{proportion}"))), else: ""),
          "carbs" => if(food.carbs, do: format_decimal(Decimal.mult(food.carbs, Decimal.new("#{proportion}"))), else: ""),
          "quantity" => "#{quantity} #{display_text}"
        }

        # Convert to URL query string
        query_string = URI.encode_query(query_params)

        # Redirect to the add food page with adjusted data
        {:noreply,
          socket
          |> assign(
            show_quantity_modal: false,
            selected_item_for_quantity: nil,
            quantity_value: "1",
            quantity_type: "servings"
          )
          |> push_navigate(to: "/d/add-food?#{query_string}", replace: false)
        }

      %{type: "recipe", item: recipe} ->
        # Calculate adjusted nutrition values based on quantity
        quantity =
          case Float.parse(socket.assigns.quantity_value) do
            {value, _} -> value
            :error -> 1.0
          end

        # For recipes, quantity is always servings
        proportion = quantity

        # Build query parameters with adjusted recipe data
        query_params = %{
          "food_name" => recipe.name,
          "calories" => if(recipe.calories, do: trunc(recipe.calories * proportion), else: ""),
          "protein" => if(recipe.protein, do: format_decimal(Decimal.mult(recipe.protein, Decimal.new("#{proportion}"))), else: ""),
          "carbs" => if(recipe.carbs, do: format_decimal(Decimal.mult(recipe.carbs, Decimal.new("#{proportion}"))), else: ""),
          "quantity" => "#{quantity} serving#{if quantity == 1, do: "", else: "s"}"
        }

        # Convert to URL query string
        query_string = URI.encode_query(query_params)

        # Redirect to the add food page with adjusted data
        {:noreply,
          socket
          |> assign(
            show_quantity_modal: false,
            selected_item_for_quantity: nil,
            quantity_value: "1",
            quantity_type: "servings"
          )
          |> push_navigate(to: "/d/add-food?#{query_string}", replace: false)
        }

      _ ->
        {:noreply, socket}
    end
  end

  @impl true
  def handle_event("update_quantity_value", %{"value" => value}, socket) do
    {:noreply, assign(socket, quantity_value: value)}
  end

  @impl true
  def handle_event("update_quantity_form", params, socket) do
    # Extract quantity_type and quantity_value from form data
    quantity_type = Map.get(params, "quantity_type", "grams")
    quantity_value = Map.get(params, "quantity_value", "1")

    # Calculate adjusted nutrition values in real-time
    adjusted_nutrition = calculate_adjusted_nutrition(socket.assigns.selected_item_for_quantity, quantity_type, quantity_value)

    {:noreply,
      assign(socket,
        quantity_type: quantity_type,
        quantity_value: quantity_value,
        adjusted_nutrition: adjusted_nutrition
      )}
  end

  # Helper function to calculate adjusted nutrition values
  defp calculate_adjusted_nutrition(selected_item, quantity_type, quantity_value) do
    case selected_item do
      %{type: "food", item: food} ->
        # Parse quantity value
        quantity =
          case Float.parse(quantity_value) do
            {value, _} -> value
            :error -> 1.0
          end

        # Parse the quantity type to get the base measurement
        {base_quantity, _display_text} =
          case quantity_type do
            "grams" -> {1, "g"}  # For grams, use 1 as base since quantity is already in grams
            "servings" -> {food.quantity, "Servings (#{food.quantity}g)"}
            type_string ->
              case String.split(type_string, "_", parts: 2) do
                [qty_str, unit] ->
                  case Float.parse(qty_str) do
                    {qty, _} -> {qty, "#{unit} (#{qty_str}g)"}
                    :error -> {food.quantity, "g"}
                  end
                _ -> {food.quantity, "g"}
              end
          end

        # Calculate the total quantity in the selected unit
        adjusted_quantity = quantity * base_quantity

        # Calculate proportion for nutrition values (always based on grams)
        proportion = adjusted_quantity / food.quantity

        # Return adjusted nutrition values
        %{
          calories: if(food.calories, do: trunc(food.calories * proportion), else: nil),
          protein: if(food.protein, do: format_decimal(Decimal.mult(food.protein, Decimal.new("#{proportion}"))), else: nil),
          carbs: if(food.carbs, do: format_decimal(Decimal.mult(food.carbs, Decimal.new("#{proportion}"))), else: nil),
          fat: if(food.fat, do: format_decimal(Decimal.mult(food.fat, Decimal.new("#{proportion}"))), else: nil)
        }

      %{type: "recipe", item: recipe} ->
        # Parse quantity value
        quantity =
          case Float.parse(quantity_value) do
            {value, _} -> value
            :error -> 1.0
          end

        # For recipes, quantity is always servings
        # The nutrition values are already per-serving, so we just multiply by the quantity
        proportion = quantity

        # Return adjusted nutrition values
        %{
          calories: if(recipe.calories, do: trunc(recipe.calories * proportion), else: nil),
          protein: if(recipe.protein, do: format_decimal(Decimal.mult(recipe.protein, Decimal.new("#{proportion}"))), else: nil),
          carbs: if(recipe.carbs, do: format_decimal(Decimal.mult(recipe.carbs, Decimal.new("#{proportion}"))), else: nil),
          fat: nil
        }

      _ ->
        %{calories: nil, protein: nil, carbs: nil, fat: nil}
    end
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
                            <img src="https://cdn.nobull.fit/apple-heart.png" alt="NoBullFit" class="w-45 h-auto mx-auto" />
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
                      <!-- Favorite Foods Table -->
                      <div class="card bg-base-200 shadow-sm">
                        <div class="card-body">
                          <table class="table">
                            <!-- head -->
                            <thead>
                              <tr>
                                <th>Food Name</th>
                                <th class="hidden md:table-cell">Default Serving</th>
                                <th class="hidden lg:table-cell">Nutrition (per 100g reference)</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              <%= for {food, index} <- Enum.with_index(@favorite_foods) do %>
                                <% per_100g = calculate_per_100g_nutrition(food) %>
                                <tr id={"favorite-food-row-#{index}"}>
                                  <td>
                                    <div class="flex items-center gap-3">
                                      <div>
                                        <div class="font-bold">
                                          <a href={"/d/nutrition-info/#{food.external_id}/#{URI.encode(food.name)}/#{food.quantity}"} class="link link-primary hover:link-primary-focus">
                                            <%= food.name %>
                                          </a>
                                        </div>
                                        <div class="text-sm opacity-50">
                                          Favorite food
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td class="hidden md:table-cell">
                                    <div class="text-sm font-medium">
                                      <%= food.quantity %>g
                                    </div>
                                    <div class="text-xs opacity-70">default</div>
                                  </td>
                                  <td class="hidden lg:table-cell">
                                    <div class="text-xs space-y-1">
                                      <%= if per_100g.calories do %>
                                        <div>Calories: <span class="font-medium"><%= per_100g.calories %> kcal</span></div>
                                      <% end %>
                                      <%= if per_100g.protein do %>
                                        <div>Protein: <span class="font-medium"><%= per_100g.protein %>g</span></div>
                                      <% end %>
                                      <%= if per_100g.carbs do %>
                                        <div>Carbs: <span class="font-medium"><%= per_100g.carbs %>g</span></div>
                                      <% end %>
                                      <%= if per_100g.fat do %>
                                        <div>Fat: <span class="font-medium"><%= per_100g.fat %>g</span></div>
                                      <% end %>
                                    </div>
                                  </td>
                                  <th>
                                    <div class="flex justify-end gap-2">
                                      <button
                                        class="btn btn-ghost btn-xs text-error"
                                        phx-click="show_delete_confirm"
                                        phx-value-id={food.id}
                                        phx-value-type="food"
                                        title="Remove from favorites"
                                      >
                                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                                        </svg>
                                      </button>

                                      <div class="dropdown dropdown-end">
                                        <button
                                          class="btn btn-ghost btn-xs"
                                          title="More actions"
                                          phx-click="load_grocery_lists"
                                          phx-value-food-index={index}
                                        >
                                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                                          </svg>
                                        </button>
                                        <ul class="dropdown-content menu bg-base-100 rounded-box w-56 z-50">
                                          <li>
                                            <button
                                              phx-click="add_to_food_log"
                                              phx-value-food-index={index}
                                              class="text-left font-normal"
                                            >
                                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                              </svg>
                                              Add to Food Log
                                            </button>
                                          </li>
                                          <li>
                                            <details>
                                              <summary class="font-normal">
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4">
                                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                                                </svg>
                                                Add to Grocery List
                                              </summary>
                                              <ul>
                                                <%= if @show_grocery_menu && @selected_food_index == index do %>
                                                  <%= for list <- @grocery_lists do %>
                                                    <li>
                                                      <button
                                                        phx-click="add_food_to_grocery_list"
                                                        phx-value-list-id={list.id}
                                                        class="text-left font-normal"
                                                      >
                                                        <%= list.name %>
                                                      </button>
                                                    </li>
                                                  <% end %>
                                                <% else %>
                                                  <li>
                                                    <button
                                                      phx-click="show_grocery_menu"
                                                      phx-value-food-index={index}
                                                      class="text-left font-normal"
                                                    >
                                                      Select List...
                                                    </button>
                                                  </li>
                                                <% end %>
                                              </ul>
                                            </details>
                                          </li>
                                        </ul>
                                      </div>
                                    </div>
                                  </th>
                                </tr>
                              <% end %>
                            </tbody>
                          </table>
                        </div>
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
                            <img src="https://cdn.nobull.fit/apple-heart.png" alt="NoBullFit" class="w-45 h-auto mx-auto" />
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
                      <!-- Favorite Recipes Table -->
                      <div class="card bg-base-200 shadow-sm">
                        <div class="card-body">
                          <table class="table">
                            <!-- head -->
                            <thead>
                              <tr>
                                <th>Recipe Name</th>
                                <th class="hidden md:table-cell">Per Serving</th>
                                <th class="hidden lg:table-cell">Nutrition</th>
                                <th class="hidden md:table-cell">Diet Labels</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              <%= for {recipe, index} <- Enum.with_index(@favorite_recipes) do %>
                                <% per_serving = calculate_per_serving_nutrition(recipe) %>
                                <tr id={"favorite-recipe-row-#{index}"}>
                                  <td>
                                    <div class="flex items-center gap-3">
                                      <div class="avatar">
                                        <div class="rounded-lg h-12 w-12">
                                          <%= if recipe.image_data do %>
                                            <img src={"/d/images/#{recipe.id}"} alt={"#{recipe.name} recipe"} class="rounded-lg" />
                                          <% else %>
                                            <%= if recipe.image_url do %>
                                              <img src={recipe.image_url} alt={"#{recipe.name} recipe"} class="rounded-lg" />
                                            <% else %>
                                              <img src="https://cdn.nobull.fit/no-image-300x300.jpg" alt={"#{recipe.name} recipe"} class="rounded-lg" />
                                            <% end %>
                                          <% end %>
                                        </div>
                                      </div>
                                      <div>
                                        <div class="font-bold">
                                          <%= if recipe.external_url do %>
                                            <a href={recipe.external_url} target="_blank" class="link link-primary hover:link-primary-focus">
                                              <%= recipe.name %>
                                            </a>
                                          <% else %>
                                            <%= recipe.name %>
                                          <% end %>
                                        </div>
                                        <div class="text-sm opacity-50">
                                          <%= if recipe.recipe_data && recipe.recipe_data["recipe"] && recipe.recipe_data["recipe"]["source"] do %>
                                            <%= recipe.recipe_data["recipe"]["source"] %>
                                          <% else %>
                                            Recipe
                                          <% end %>
                                        </div>
                                        <div class="text-xs opacity-70">
                                          <%= if recipe.yield do %>
                                            <%= recipe.yield %> servings
                                          <% else %>
                                            1 serving
                                          <% end %>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td class="hidden md:table-cell">
                                    <div class="text-sm font-medium">
                                      <%= per_serving.calories %> kcal
                                    </div>
                                    <div class="text-xs opacity-70">per serving</div>
                                  </td>
                                  <td class="hidden lg:table-cell">
                                    <div class="text-xs space-y-1">
                                      <%= if per_serving.nutrients["PROCNT"] && per_serving.nutrients["PROCNT"]["quantity"] do %>
                                        <div>Protein: <span class="font-medium"><%= per_serving.nutrients["PROCNT"]["quantity"] %>g</span></div>
                                      <% end %>
                                      <%= if per_serving.nutrients["CHOCDF"] && per_serving.nutrients["CHOCDF"]["quantity"] do %>
                                        <div>Carbs: <span class="font-medium"><%= per_serving.nutrients["CHOCDF"]["quantity"] %>g</span></div>
                                      <% end %>
                                      <%= if per_serving.nutrients["FAT"] && per_serving.nutrients["FAT"]["quantity"] do %>
                                        <div>Fat: <span class="font-medium"><%= per_serving.nutrients["FAT"]["quantity"] %>g</span></div>
                                      <% end %>
                                    </div>
                                  </td>
                                  <td class="hidden md:table-cell">
                                    <%= if recipe.diet_labels && length(recipe.diet_labels) > 0 do %>
                                      <div class="flex flex-wrap gap-1">
                                        <%= for label <- recipe.diet_labels do %>
                                          <span class="badge badge-primary badge-sm"><%= label %></span>
                                        <% end %>
                                      </div>
                                    <% else %>
                                      <span class="text-base-content/50 text-sm">None</span>
                                    <% end %>
                                  </td>
                                  <th>
                                    <div class="flex justify-end gap-2">
                                      <button
                                        class="btn btn-ghost btn-xs text-error"
                                        phx-click="show_delete_confirm"
                                        phx-value-id={recipe.id}
                                        phx-value-type="recipe"
                                        title="Remove from favorites"
                                      >
                                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                                        </svg>
                                      </button>

                                      <div class="dropdown dropdown-end">
                                        <button
                                          class="btn btn-ghost btn-xs"
                                          title="More actions"
                                          phx-click="load_grocery_lists"
                                          phx-value-recipe-index={index}
                                        >
                                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                                          </svg>
                                        </button>
                                        <ul class="dropdown-content menu bg-base-100 rounded-box w-56 z-50">
                                          <li>
                                            <button
                                              phx-click="add_recipe_to_food_log"
                                              phx-value-recipe-index={index}
                                              class="text-left font-normal"
                                            >
                                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                              </svg>
                                              Add to Food Log
                                            </button>
                                          </li>
                                          <li>
                                            <details>
                                              <summary class="font-normal">
                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4">
                                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                                                </svg>
                                                Add to Grocery List
                                              </summary>
                                              <ul>
                                                <%= if @show_grocery_menu && @selected_recipe_index == index do %>
                                                  <%= for list <- @grocery_lists do %>
                                                    <li>
                                                      <button
                                                        phx-click="add_to_grocery_list"
                                                        phx-value-list-id={list.id}
                                                        class="text-left font-normal"
                                                      >
                                                        <%= list.name %>
                                                      </button>
                                                    </li>
                                                  <% end %>
                                                <% else %>
                                                  <li>
                                                    <button
                                                      phx-click="show_grocery_menu"
                                                      phx-value-recipe-index={index}
                                                      class="text-left font-normal"
                                                    >
                                                      Select List...
                                                    </button>
                                                  </li>
                                                <% end %>
                                              </ul>
                                            </details>
                                          </li>
                                        </ul>
                                      </div>
                                    </div>
                                  </th>
                                </tr>
                              <% end %>
                            </tbody>
                          </table>
                        </div>
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

      <!-- Delete Confirmation Modal -->
      <%= if @show_delete_confirm and @item_to_delete do %>
        <div class="modal modal-open">
          <div class="modal-box">
            <h3 class="font-bold text-lg">Remove from Favorites</h3>
            <p class="py-4">
              Are you sure you want to remove "<%= @item_to_delete.name %>" from your favorites?
            </p>
            <div class="modal-action">
              <button phx-click="hide_delete_confirm" class="btn btn-ghost">Cancel</button>
              <button phx-click="confirm_delete" class="btn btn-error">Remove</button>
            </div>
          </div>
        </div>
      <% end %>

      <!-- Quantity Selection Modal -->
      <%= if @show_quantity_modal and @selected_item_for_quantity do %>
        <div class="modal modal-open">
          <div class="modal-box">
            <h3 class="font-bold text-lg">Select Quantity</h3>
            <p class="py-4">
              How much of "<%= @selected_item_for_quantity.item.name %>" did you consume?
            </p>

            <form phx-change="update_quantity_form" class="space-y-4">
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Quantity Type</legend>
                <select class="select select-bordered w-full" name="quantity_type">
                  <%= if @selected_item_for_quantity.type == "food" do %>
                    <%= if @selected_item_for_quantity.item.measures && length(@selected_item_for_quantity.item.measures) > 0 do %>
                      <%= for measure <- @selected_item_for_quantity.item.measures do %>
                        <option value={"#{measure["weight"]}_#{measure["label"]}"} selected={@quantity_type == "#{measure["weight"]}_#{measure["label"]}"}>
                          <%= measure["label"] %> (<%= measure["weight"] %>g)
                        </option>
                      <% end %>
                    <% else %>
                      <option value="grams" selected={@quantity_type == "grams"}>Grams</option>
                      <option value="servings" selected={@quantity_type == "servings"}>Servings (<%= @selected_item_for_quantity.item.quantity %>g each)</option>
                    <% end %>
                  <% else %>
                    <option value="servings" selected={@quantity_type == "servings"}>Servings</option>
                  <% end %>
                </select>
              </fieldset>

              <fieldset class="fieldset">
                <legend class="fieldset-legend">Quantity</legend>
                <input
                  type="number"
                  class="input input-bordered w-full"
                  name="quantity_value"
                  value={@quantity_value}
                  step="0.1"
                  min="0.1"
                  placeholder="1.0"
                />
              </fieldset>

              <!-- Real-time Nutrition Preview -->
              <%= if @adjusted_nutrition do %>
                <div class="bg-base-300 rounded-lg p-4">
                  <h4 class="font-semibold mb-2">Nutrition Preview:</h4>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <%= if @adjusted_nutrition.calories do %>
                      <div>Calories: <span class="font-medium"><%= @adjusted_nutrition.calories %> kcal</span></div>
                    <% end %>
                    <%= if @adjusted_nutrition.protein do %>
                      <div>Protein: <span class="font-medium"><%= @adjusted_nutrition.protein %>g</span></div>
                    <% end %>
                    <%= if @adjusted_nutrition.carbs do %>
                      <div>Carbs: <span class="font-medium"><%= @adjusted_nutrition.carbs %>g</span></div>
                    <% end %>
                    <%= if @adjusted_nutrition.fat do %>
                      <div>Fat: <span class="font-medium"><%= @adjusted_nutrition.fat %>g</span></div>
                    <% end %>
                  </div>
                </div>
              <% end %>
            </form>

            <div class="modal-action">
              <button phx-click="hide_quantity_modal" class="btn btn-ghost">Cancel</button>
              <button phx-click="confirm_quantity" class="btn btn-primary">Add to Food Log</button>
            </div>
          </div>
        </div>
      <% end %>
    </div>
    """
  end
end
