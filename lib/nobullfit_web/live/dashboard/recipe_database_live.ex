defmodule NobullfitWeb.Dashboard.RecipeDatabaseLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.CoreComponents
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]
  import NobullfitWeb.Components.Sidebar, only: [sidebar: 1]
  import NobullfitWeb.Layouts, only: [flash_group: 1]

  on_mount {NobullfitWeb.UserAuth, :require_authenticated}

  alias Nobullfit.UserFavorites

  # Helper function to format diet labels for display
  defp format_diet_label(label) do
    label
    |> String.replace("-", " ")
    |> String.split(" ")
    |> Enum.map(&String.capitalize/1)
    |> Enum.join(" ")
  end

  # Helper function to build calorie range string for API
  defp build_calories_range(min, max) do
    min_trimmed = String.trim(min)
    max_trimmed = String.trim(max)

    cond do
      min_trimmed != "" && max_trimmed != "" ->
        "#{min_trimmed}-#{max_trimmed}"

      min_trimmed != "" && max_trimmed == "" ->
        "#{min_trimmed}+"

      min_trimmed == "" && max_trimmed != "" ->
        max_trimmed

      true ->
        ""
    end
  end

  # Helper function to format decimal values for query parameters
  defp format_decimal(value) when is_struct(value, Decimal) do
    Decimal.round(value, 2) |> Decimal.to_string()
  end

  defp format_decimal(value) when is_number(value) do
    Decimal.new("#{value}") |> Decimal.round(2) |> Decimal.to_string()
  end

  defp format_decimal(_), do: ""

  @impl true
  def mount(_params, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})

    {:ok,
     assign(socket,
       page_title: "Recipe Database",
       current_path: "/d/recipe-database",
       maintenance_status: maintenance_status,
       search_query: "",
       search_results: [],
       loading: false,
       error: nil,
       current_page: 1,
       total_count: 0,
       from: 0,
       to: 0,
       next_url: nil,
       prev_url: nil,
       page_history: [],
       selected_diet_labels: [],
       selected_meal_types: [],
       selected_dish_types: [],
       calories_min: "",
       calories_max: "",
       filters_visible: false,
       search_performed: false,
       grocery_lists: [],
       show_grocery_menu: false,
       selected_recipe_index: nil,
       favorited_recipes: MapSet.new(),
       show_quantity_modal: false,
       selected_item_for_quantity: nil,
       quantity_value: "1",
       quantity_type: "servings",
       adjusted_nutrition: %{calories: nil, protein: nil, carbs: nil, fat: nil}
     )}
  end

  @impl true
  def handle_event("search", %{"query" => query} = params, socket) do
    if String.length(query) >= 2 do
      # Extract calorie values from form submission or use current socket assigns
      calories_min = Map.get(params, "calories_min", socket.assigns.calories_min)
      calories_max = Map.get(params, "calories_max", socket.assigns.calories_max)

      send(
        self(),
        {:perform_search_with_filters, query, socket.assigns.selected_diet_labels, socket.assigns.selected_meal_types, socket.assigns.selected_dish_types, calories_min, calories_max}
      )

      {:noreply,
       assign(socket,
         search_query: query,
         calories_min: calories_min,
         calories_max: calories_max,
         loading: true,
         error: nil,
         current_page: 1,
         search_performed: true,
         filters_visible: false
       )}
    else
      {:noreply, assign(socket, search_query: query, search_results: [])}
    end
  end

  @impl true
  def handle_event("load_page", %{"page" => page}, socket) do
    page = String.to_integer(page)

    case page do
      1 ->
        # Go back to first page
        send(self(), {:perform_search_with_filters, socket.assigns.search_query, socket.assigns.selected_diet_labels, socket.assigns.selected_meal_types, socket.assigns.selected_dish_types, socket.assigns.calories_min, socket.assigns.calories_max})

        {:noreply, assign(socket, loading: true, error: nil, current_page: page)}

      _ ->
        # Use next URL for pagination
        if socket.assigns.next_url do
          send(self(), {:perform_search_url, socket.assigns.next_url, page})

          {:noreply, assign(socket, loading: true, error: nil, current_page: page)}
        else
          {:noreply, socket}
        end
    end
  end

  @impl true
  def handle_event("next_page", _params, socket) do
    if socket.assigns.next_url do
      send(self(), {:perform_search_url, socket.assigns.next_url, socket.assigns.current_page + 1})

      {:noreply,
       assign(socket,
         loading: true,
         error: nil,
         current_page: socket.assigns.current_page + 1
       )}
    else
      {:noreply, socket}
    end
  end

  @impl true
  def handle_event("prev_page", _params, socket) do
    if socket.assigns.prev_url do
      case socket.assigns.prev_url do
        "page_1" ->
          # Go back to first page by performing a new search
          send(self(), {:perform_search_with_filters, socket.assigns.search_query, socket.assigns.selected_diet_labels, socket.assigns.selected_meal_types, socket.assigns.selected_dish_types, socket.assigns.calories_min, socket.assigns.calories_max})

          {:noreply, assign(socket, loading: true, error: nil, current_page: 1)}

        _ ->
          # Use the previous URL for navigation
          send(self(), {:perform_search_url, socket.assigns.prev_url, socket.assigns.current_page - 1})

          {:noreply,
           assign(socket,
             loading: true,
             error: nil,
             current_page: socket.assigns.current_page - 1
           )}
      end
    else
      {:noreply, socket}
    end
  end

  @impl true
  def handle_event("clear_search", _params, socket) do
    {:noreply,
     assign(socket,
       search_query: "",
       search_results: [],
       error: nil,
       current_page: 1,
       total_count: 0,
       from: 0,
       to: 0,
       next_url: nil,
       prev_url: nil,
       page_history: [],
       selected_diet_labels: [],
       selected_meal_types: [],
       selected_dish_types: [],
       calories_min: "",
       calories_max: "",
       filters_visible: false,
       search_performed: false
     )}
  end

  @impl true
  def handle_event("toggle_diet_label", %{"label" => label}, socket) do
    current_labels = socket.assigns.selected_diet_labels

    new_labels =
      if label in current_labels do
        List.delete(current_labels, label)
      else
        [label | current_labels]
      end

    {:noreply, assign(socket, selected_diet_labels: new_labels)}
  end

  @impl true
  def handle_event("toggle_meal_type", %{"meal_type" => meal_type}, socket) do
    current_meal_types = socket.assigns.selected_meal_types

    new_meal_types =
      if meal_type in current_meal_types do
        List.delete(current_meal_types, meal_type)
      else
        [meal_type | current_meal_types]
      end

    {:noreply, assign(socket, selected_meal_types: new_meal_types)}
  end

  @impl true
  def handle_event("toggle_dish_type", %{"dish_type" => dish_type}, socket) do
    current_dish_types = socket.assigns.selected_dish_types

    new_dish_types =
      if dish_type in current_dish_types do
        List.delete(current_dish_types, dish_type)
      else
        [dish_type | current_dish_types]
      end

    {:noreply, assign(socket, selected_dish_types: new_dish_types)}
  end

  @impl true
  def handle_event("update_calories_min", %{"calories_min" => value}, socket) do
    {:noreply, assign(socket, calories_min: value)}
  end

  @impl true
  def handle_event("update_calories_max", %{"calories_max" => value}, socket) do
    {:noreply, assign(socket, calories_max: value)}
  end

  @impl true
  def handle_event("toggle_filters", _params, socket) do
    # Preserve the current search query when toggling filters
    # The search_query is already in the socket assigns, so we just toggle filters_visible
    {:noreply, assign(socket, filters_visible: !socket.assigns.filters_visible)}
  end

  @impl true
  def handle_event("update_search_query", %{"query" => query}, socket) do
    # Update the search query as the user types
    {:noreply, assign(socket, search_query: query)}
  end

  @impl true
  def handle_event("print_ingredients", %{"recipe-index" => recipe_index}, socket) do
    index = String.to_integer(recipe_index)

    if index < length(socket.assigns.search_results) do
      recipe = Enum.at(socket.assigns.search_results, index)["recipe"]

      IO.puts("\n=== Ingredients for: #{recipe["label"]} ===")

      if recipe["ingredients"] && length(recipe["ingredients"]) > 0 do
        Enum.each(recipe["ingredients"], fn ingredient ->
          IO.puts("• #{ingredient["text"]}")
          IO.puts("  Quantity: #{ingredient["quantity"]} #{ingredient["measure"]}")
          IO.puts("  Food: #{ingredient["food"]}")
          IO.puts("  Weight: #{ingredient["weight"]}g")
          IO.puts("  Food ID: #{ingredient["foodId"]}")
          IO.puts("")
        end)
      else
        IO.puts("No ingredients data available for this recipe.")
      end

      IO.puts("=")
    end

    {:noreply, socket}
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
  def handle_event("hide_grocery_menu", _params, socket) do
    {:noreply, assign(socket, show_grocery_menu: false, selected_recipe_index: nil)}
  end

  @impl true
  def handle_event("add_to_grocery_list", %{"list-id" => list_id}, socket) do
    if socket.assigns.selected_recipe_index && socket.assigns.selected_recipe_index < length(socket.assigns.search_results) do
      recipe = Enum.at(socket.assigns.search_results, socket.assigns.selected_recipe_index)["recipe"]

      if recipe["ingredients"] && length(recipe["ingredients"]) > 0 do
        case Nobullfit.GroceryLists.add_recipe_ingredients_to_list(String.to_integer(list_id), recipe["ingredients"]) do
          {:ok, _result} ->
            {:noreply,
             socket
             |> assign(show_grocery_menu: false, selected_recipe_index: nil)
             |> put_flash(:info, "Ingredients added to grocery list successfully!")
            }

          {:error, _error} ->
            {:noreply,
             socket
             |> assign(show_grocery_menu: false, selected_recipe_index: nil)
             |> put_flash(:error, "Failed to add ingredients to grocery list.")
            }
        end
      else
        {:noreply,
         socket
         |> assign(show_grocery_menu: false, selected_recipe_index: nil)
         |> put_flash(:error, "No ingredients found for this recipe.")
        }
      end
    else
      {:noreply, assign(socket, show_grocery_menu: false, selected_recipe_index: nil)}
    end
  end

  @impl true
  def handle_event("add_recipe_to_food_log", %{"recipe-index" => recipe_index}, socket) do
    recipe_index_int = String.to_integer(recipe_index)
    if recipe_index_int < length(socket.assigns.search_results) do
      recipe = Enum.at(socket.assigns.search_results, recipe_index_int)["recipe"]

      # Calculate initial adjusted nutrition for 1 serving using search result data
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
       quantity_type: "servings",
       adjusted_nutrition: %{calories: nil, protein: nil, carbs: nil, fat: nil}
     )}
  end

  @impl true
  def handle_event("update_quantity_form", params, socket) do
    # Extract quantity_type and quantity_value from form data
    quantity_type = Map.get(params, "quantity_type", "servings")
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

  @impl true
  def handle_event("confirm_quantity", _params, socket) do
    case socket.assigns.selected_item_for_quantity do
      %{type: "recipe", item: recipe} ->
        # Calculate adjusted nutrition values based on quantity
        quantity =
          case Float.parse(socket.assigns.quantity_value) do
            {value, _} -> value
            :error -> 1.0
          end

        # For recipes, quantity is always servings
        proportion = quantity

        # Get the yield (number of servings) - default to 1 if not provided
        yield = recipe["yield"] || 1

        # Calculate per-serving nutrition values
        calories_per_serving =
          if yield > 0, do: trunc((recipe["calories"] || 0) / yield), else: (recipe["calories"] || 0)

        # For search results, we might not have totalNutrients, so we'll use basic nutrition info if available
        # The search results typically only have calories, not detailed protein/carbs breakdown
        protein_per_serving =
          if yield > 0 and recipe["totalNutrients"] && recipe["totalNutrients"]["PROCNT"] do
            Decimal.div(Decimal.new("#{recipe["totalNutrients"]["PROCNT"]["quantity"]}"), Decimal.new("#{yield}"))
          else
            nil
          end

        carbs_per_serving =
          if yield > 0 and recipe["totalNutrients"] && recipe["totalNutrients"]["CHOCDF"] do
            Decimal.div(Decimal.new("#{recipe["totalNutrients"]["CHOCDF"]["quantity"]}"), Decimal.new("#{yield}"))
          else
            nil
          end

        # Build query parameters with adjusted recipe data (per-serving values multiplied by quantity)
        query_params = %{
          "food_name" => recipe["label"],
          "calories" => trunc(calories_per_serving * proportion),
          "protein" => if(protein_per_serving, do: format_decimal(Decimal.mult(protein_per_serving, Decimal.new("#{proportion}"))), else: ""),
          "carbs" => if(carbs_per_serving, do: format_decimal(Decimal.mult(carbs_per_serving, Decimal.new("#{proportion}"))), else: ""),
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
           quantity_type: "servings",
           adjusted_nutrition: %{calories: nil, protein: nil, carbs: nil, fat: nil}
         )
         |> push_navigate(to: "/d/add-food?#{query_string}", replace: false)
        }

      _ ->
        {:noreply, socket}
    end
  end

  @impl true
  def handle_event("toggle_recipe_favorite", %{"recipe-index" => recipe_index}, socket) do
    user_id = socket.assigns.current_scope.user.id
    recipe_index = String.to_integer(recipe_index)

    if recipe_index < length(socket.assigns.search_results) do
      recipe = Enum.at(socket.assigns.search_results, recipe_index)["recipe"]

      if MapSet.member?(socket.assigns.favorited_recipes, recipe["uri"]) do
        # Remove from favorites
        case UserFavorites.delete_user_favorite_by_external_id(user_id, "recipe", recipe["uri"], recipe["label"]) do
          {:ok, _} ->
            {:noreply,
             socket
             |> assign(favorited_recipes: MapSet.delete(socket.assigns.favorited_recipes, recipe["uri"]))
             |> put_flash(:info, "Removed from favorites")}

          {:error, _} ->
            {:noreply, put_flash(socket, :error, "Failed to remove from favorites")}
        end
      else
        # Add to favorites
        case UserFavorites.create_recipe_favorite(user_id, %{"recipe" => recipe}) do
          {:ok, _favorite} ->
            {:noreply,
             socket
             |> assign(favorited_recipes: MapSet.put(socket.assigns.favorited_recipes, recipe["uri"]))
             |> put_flash(:info, "Added to favorites")}

          {:error, _changeset} ->
            {:noreply, put_flash(socket, :error, "Failed to add to favorites")}
        end
      end
    else
      {:noreply, socket}
    end
  end

  # Helper function to calculate adjusted nutrition values
  defp calculate_adjusted_nutrition(selected_item, _quantity_type, quantity_value) do
    case selected_item do
      %{type: "recipe", item: recipe} ->
        # Parse quantity value
        quantity =
          case Float.parse(quantity_value) do
            {value, _} -> value
            :error -> 1.0
          end

        # For recipes, quantity is always servings
        # Get the yield (number of servings) - default to 1 if not provided
        yield =
          case recipe["yield"] do
            nil -> 1
            yield_value when is_number(yield_value) -> trunc(yield_value)
            _ -> 1
          end

        # Calculate per-serving nutrition values
        calories_per_serving =
          if yield > 0, do: trunc((recipe["calories"] || 0) / yield), else: (recipe["calories"] || 0)

        # For search results, we might not have totalNutrients, so we'll use basic nutrition info if available
        # The search results typically only have calories, not detailed protein/carbs breakdown
        protein_per_serving =
          if yield > 0 and recipe["totalNutrients"] && recipe["totalNutrients"]["PROCNT"] do
            Decimal.div(Decimal.new("#{recipe["totalNutrients"]["PROCNT"]["quantity"]}"), Decimal.new("#{yield}"))
          else
            nil
          end

        carbs_per_serving =
          if yield > 0 and recipe["totalNutrients"] && recipe["totalNutrients"]["CHOCDF"] do
            Decimal.div(Decimal.new("#{recipe["totalNutrients"]["CHOCDF"]["quantity"]}"), Decimal.new("#{yield}"))
          else
            nil
          end

        # Calculate proportion for the selected quantity
        proportion = quantity

        # Return adjusted nutrition values
        %{
          calories: if(calories_per_serving, do: trunc(calories_per_serving * proportion), else: nil),
          protein: if(protein_per_serving, do: format_decimal(Decimal.mult(protein_per_serving, Decimal.new("#{proportion}"))), else: nil),
          carbs: if(carbs_per_serving, do: format_decimal(Decimal.mult(carbs_per_serving, Decimal.new("#{proportion}"))), else: nil),
          fat: nil
        }

      _ ->
        %{calories: nil, protein: nil, carbs: nil, fat: nil}
    end
  end

  @impl true
  def handle_info({:perform_search, query, _page}, socket) do
    case NoBullFit.RecipeAPI.search_recipes(q: query) do
      {:ok, data} ->
        # Filter out recipes without URLs
        filtered_results =
          Enum.filter(data["hits"] || [], fn hit ->
            recipe = hit["recipe"]
            recipe["url"] && recipe["url"] != ""
          end)

        # Extract next URL from the response
        links = data["_links"] || %{}
        next_url = if links["next"], do: links["next"]["href"], else: nil

        # Check which recipes are favorited
        user_id = socket.assigns.current_scope.user.id
        favorited_recipes =
          filtered_results
          |> Enum.map(fn hit -> {hit["recipe"]["uri"], hit["recipe"]["label"]} end)
          |> Enum.filter(fn {uri, label} -> UserFavorites.is_favorited?(user_id, "recipe", uri, label) end)
          |> Enum.map(fn {uri, _label} -> uri end)
          |> MapSet.new()

        {:noreply,
         assign(socket,
           search_results: filtered_results,
           loading: false,
           total_count: data["count"] || 0,
           from: data["from"] || 0,
           to: data["to"] || 0,
           current_page: 1,
           next_url: next_url,
           prev_url: nil,
           page_history: [],
           favorited_recipes: favorited_recipes
         )}

      {:error, error} ->
        error_message =
          if String.contains?(error, "credentials") do
            "Recipe API credentials not configured. Please update the RecipeAPI module with your Edamam API credentials."
          else
            "Search failed: #{error}"
          end

        {:noreply,
         assign(socket,
           error: error_message,
           loading: false
         )}
    end
  end

  @impl true
  def handle_info({:perform_search_url, url, page}, socket) do
    case NoBullFit.RecipeAPI.search_recipes_by_url(url) do
      {:ok, data} ->
        # Filter out recipes without URLs
        filtered_results =
          Enum.filter(data["hits"] || [], fn hit ->
            recipe = hit["recipe"]
            recipe["url"] && recipe["url"] != ""
          end)

        # Extract next URL from the response
        links = data["_links"] || %{}
        next_url = if links["next"], do: links["next"]["href"], else: nil

        # For pages beyond the first, we should have a previous URL
        # We'll use a special marker to indicate going back to page 1
        prev_url = if page > 1, do: "page_1", else: nil

        # Check which recipes are favorited
        user_id = socket.assigns.current_scope.user.id
        favorited_recipes =
          filtered_results
          |> Enum.map(fn hit -> {hit["recipe"]["uri"], hit["recipe"]["label"]} end)
          |> Enum.filter(fn {uri, label} -> UserFavorites.is_favorited?(user_id, "recipe", uri, label) end)
          |> Enum.map(fn {uri, _label} -> uri end)
          |> MapSet.new()

        {:noreply,
         assign(socket,
           search_results: filtered_results,
           loading: false,
           total_count: data["count"] || 0,
           from: data["from"] || 0,
           to: data["to"] || 0,
           current_page: page,
           next_url: next_url,
           prev_url: prev_url,
           page_history: [],
           favorited_recipes: favorited_recipes
         )}

      {:error, error} ->
        {:noreply,
         assign(socket,
           error: "Failed to load next page: #{error}",
           loading: false
         )}
    end
  end

  @impl true
  def handle_info(
        {:perform_search_with_filters, query, diet_labels, meal_types, dish_types, calories_min, calories_max},
        socket
      ) do
    # Build search options with diet, meal type, dish type, and calorie filters
    search_opts = [q: query]

    search_opts =
      if length(diet_labels) > 0 do
        [diet: diet_labels] ++ search_opts
      else
        search_opts
      end

    search_opts =
      if length(meal_types) > 0 do
        [mealType: meal_types] ++ search_opts
      else
        search_opts
      end

    search_opts =
      if length(dish_types) > 0 do
        [dishType: dish_types] ++ search_opts
      else
        search_opts
      end

    # Build calorie range string
    calories_range = build_calories_range(calories_min, calories_max)

    search_opts =
      if calories_range != "" do
        [calories: calories_range] ++ search_opts
      else
        search_opts
      end

    case NoBullFit.RecipeAPI.search_recipes(search_opts) do
      {:ok, data} ->
        # Filter out recipes without URLs
        filtered_results =
          Enum.filter(data["hits"] || [], fn hit ->
            recipe = hit["recipe"]
            recipe["url"] && recipe["url"] != ""
          end)

        # Extract next URL from the response
        links = data["_links"] || %{}
        next_url = if links["next"], do: links["next"]["href"], else: nil

        # Check which recipes are favorited
        user_id = socket.assigns.current_scope.user.id
        favorited_recipes =
          filtered_results
          |> Enum.map(fn hit -> {hit["recipe"]["uri"], hit["recipe"]["label"]} end)
          |> Enum.filter(fn {uri, label} -> UserFavorites.is_favorited?(user_id, "recipe", uri, label) end)
          |> Enum.map(fn {uri, _label} -> uri end)
          |> MapSet.new()

        {:noreply,
         assign(socket,
           search_results: filtered_results,
           loading: false,
           total_count: data["count"] || 0,
           from: data["from"] || 0,
           to: data["to"] || 0,
           current_page: 1,
           next_url: next_url,
           prev_url: nil,
           page_history: [],
           favorited_recipes: favorited_recipes
         )}

      {:error, error} ->
        error_message =
          if String.contains?(error, "credentials") do
            "Recipe API credentials not configured. Please update the RecipeAPI module with your Edamam API credentials."
          else
            "Search failed: #{error}"
          end

        {:noreply,
         assign(socket,
           error: error_message,
           loading: false
         )}
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
                Recipe Database
                <:subtitle>Search and discover recipes from around the world</:subtitle>
              </.header>

              <!-- Search Section -->
              <div class="max-w-5xl mx-auto">
                <div class="bg-base-200 rounded-lg p-10 mb-12">
                  <div class="flex justify-between items-center mb-6">
                    <.header>
                      Search Recipes
                      <:subtitle>Enter ingredients, dish names, or cuisine types to find delicious recipes</:subtitle>
                    </.header>
                    <button phx-click="clear_search" class="btn btn-sm btn-ghost hidden md:inline-flex">Clear</button>
                  </div>

                  <form phx-submit="search" class="space-y-6" id="search-form">
                    <fieldset class="fieldset">
                      <legend class="fieldset-legend">Search Query</legend>
                      <input
                        type="text"
                        name="query"
                        value={@search_query}
                        placeholder="Enter recipe name, ingredients, or cuisine..."
                        class="input input-bordered w-full"
                        autocomplete="off"
                        phx-change="update_search_query"
                      />
                    </fieldset>

                    <div class="flex gap-3">
                      <button type="submit" class="btn btn-primary flex-1" disabled={@loading}>
                        <%= if @loading do %>
                          <span class="loading loading-spinner loading-sm"></span>
                        <% end %>
                        Search
                      </button>
                      <button type="button" phx-click="toggle_filters" class="btn btn-ghost relative">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        Filters
                        <%= if length(@selected_diet_labels) + length(@selected_meal_types) + length(@selected_dish_types) + (if @calories_min != "" or @calories_max != "", do: 1, else: 0) > 0 do %>
                          <span class="badge badge-primary badge-xs absolute -top-2 -right-2">
                            <%= length(@selected_diet_labels) + length(@selected_meal_types) + length(@selected_dish_types) + (if @calories_min != "" or @calories_max != "", do: 1, else: 0) %>
                          </span>
                        <% end %>
                      </button>
                    </div>

                    <div class={"filter-section #{if @filters_visible, do: "", else: "hidden"}"}>
                      <fieldset class="fieldset">
                        <legend class="fieldset-legend">Diet Filters</legend>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                          <%= for diet_label <- ["balanced", "high-fiber", "high-protein", "low-carb", "low-fat", "low-sodium"] do %>
                            <label class="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                class="checkbox checkbox-sm"
                                checked={diet_label in @selected_diet_labels}
                                phx-click="toggle_diet_label"
                                phx-value-label={diet_label}
                              />
                              <span class="text-sm font-medium">
                                <%= format_diet_label(diet_label) %>
                              </span>
                            </label>
                          <% end %>
                        </div>
                      </fieldset>

                      <fieldset class="fieldset mt-2">
                        <legend class="fieldset-legend">Meal Type Filters</legend>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                          <%= for meal_type <- ["Breakfast", "Lunch", "Dinner", "Snack", "Teatime"] do %>
                            <label class="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                class="checkbox checkbox-sm"
                                checked={meal_type in @selected_meal_types}
                                phx-click="toggle_meal_type"
                                phx-value-meal_type={meal_type}
                              />
                              <span class="text-sm font-medium">
                                <%= meal_type %>
                              </span>
                            </label>
                          <% end %>
                        </div>
                      </fieldset>

                      <fieldset class="fieldset mt-2">
                        <legend class="fieldset-legend">Dish Type Filters</legend>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                          <%= for dish_type <- ["Biscuits and cookies", "Bread", "Cereals", "Condiments and sauces", "Desserts", "Drinks", "Main course", "Pancake", "Preps", "Preserve", "Salad", "Sandwiches", "Side dish", "Soup", "Starter", "Sweets"] do %>
                            <label class="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                class="checkbox checkbox-sm"
                                checked={dish_type in @selected_dish_types}
                                phx-click="toggle_dish_type"
                                phx-value-dish_type={dish_type}
                              />
                              <span class="text-sm font-medium">
                                <%= dish_type %>
                              </span>
                            </label>
                          <% end %>
                        </div>
                      </fieldset>

                      <fieldset class="fieldset mt-2">
                        <legend class="fieldset-legend">Calorie Range</legend>
                        <div class="grid grid-cols-2 gap-4 mt-2">
                          <input
                            type="number"
                            name="calories_min"
                            min="0"
                            step="1"
                            value={@calories_min}
                            placeholder="Minimum calories (e.g., 100)"
                            class="input input-bordered w-full"
                            phx-change="update_calories_min"
                            phx-debounce="300"
                          />
                          <input
                            type="number"
                            name="calories_max"
                            min="0"
                            step="1"
                            value={@calories_max}
                            placeholder="Maximum calories (e.g., 500)"
                            class="input input-bordered w-full"
                            phx-change="update_calories_max"
                            phx-debounce="300"
                          />
                        </div>
                        <p class="label mt-3">Leave empty for no limit. Use both for a range (e.g., 100-500), or one for minimum/maximum only.</p>
                      </fieldset>
                    </div>
                  </form>
                </div>

                <!-- Search Results -->
                <%= if length(@search_results) > 0 or @loading do %>
                  <div class="max-w-5xl mx-auto">
                    <div class="bg-base-200 rounded-lg p-8">
                      <.header>
                        Search Results
                        <:subtitle>
                          <%= if @loading do %>
                            Loading...
                          <% else %>
                            Found <%= @total_count %> recipes matching your search query. Showing <%= @from %>-<%= @to %>.
                          <% end %>
                        </:subtitle>
                      </.header>

                      <table class="table" id={"recipe-table-#{@current_page}"}>
                        <!-- head -->
                        <thead>
                          <tr>
                            <th>Recipe Name</th>
                            <th class="hidden md:table-cell">Calories</th>
                            <th class="hidden md:table-cell">Diet Labels</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          <%= if @loading do %>
                            <tr>
                              <td colspan="4" class="text-center py-8">
                                <div class="flex items-center justify-center">
                                  <span class="loading loading-spinner loading-md"></span>
                                  <span class="ml-2">Loading recipes...</span>
                                </div>
                              </td>
                            </tr>
                          <% else %>
                            <%= for {result, index} <- Enum.with_index(@search_results) do %>
                              <tr id={"recipe-row-#{@current_page}-#{index}"}>
                                <td>
                                  <div class="flex items-center gap-3">
                                    <div class="avatar">
                                      <div class="rounded-lg h-12 w-12">
                                        <%= if result["recipe"]["image"] && result["recipe"]["image"] != "" do %>
                                          <img src={result["recipe"]["image"]} alt={"#{result["recipe"]["label"]} recipe"} class="rounded-lg" />
                                        <% else %>
                                          <img src="/assets/images/no-image-300x300.jpg" alt={"#{result["recipe"]["label"]} recipe"} class="rounded-lg" />
                                        <% end %>
                                      </div>
                                    </div>
                                    <div>
                                      <div class="font-bold">
                                        <a href={result["recipe"]["url"]} target="_blank" class="link link-primary hover:link-primary-focus">
                                          <%= result["recipe"]["label"] %>
                                        </a>
                                      </div>
                                      <div class="text-sm opacity-50">
                                        <%= if result["recipe"]["source"] do %>
                                          <%= result["recipe"]["source"] %>
                                        <% else %>
                                          Recipe
                                        <% end %>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td class="hidden md:table-cell">
                                  <div class="text-sm font-medium">
                                    <%= result["recipe"]["calories"] |> round() %> kcal
                                  </div>
                                </td>
                                <td class="hidden md:table-cell">
                                  <%= if result["recipe"]["dietLabels"] && length(result["recipe"]["dietLabels"]) > 0 do %>
                                    <div class="flex flex-wrap gap-1">
                                      <%= for label <- result["recipe"]["dietLabels"] do %>
                                        <span class="badge badge-primary badge-sm"><%= label %></span>
                                      <% end %>
                                    </div>
                                  <% else %>
                                    <span class="text-base-content/50 text-sm">None</span>
                                  <% end %>
                                </td>
                                <th>
                                  <div class="flex gap-2">
                                    <button
                                      phx-click="toggle_recipe_favorite"
                                      phx-value-recipe-index={index}
                                      class={[
                                        "btn btn-ghost btn-xs",
                                        if(MapSet.member?(@favorited_recipes, result["recipe"]["uri"]), do: "btn-primary", else: "")
                                      ]}
                                      title={if(MapSet.member?(@favorited_recipes, result["recipe"]["uri"]), do: "Remove from favorites", else: "Add to favorites")}
                                    >
                                      <%= if MapSet.member?(@favorited_recipes, result["recipe"]["uri"]) do %>
                                        <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                          <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path>
                                        </svg>
                                      <% else %>
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                                        </svg>
                                      <% end %>
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
                          <% end %>
                        </tbody>
                      </table>

                      <!-- Pagination -->
                      <%= if @total_count > 20 do %>
                        <div class="flex justify-center mt-6">
                          <div class="join">
                            <%= if @prev_url do %>
                              <button phx-click="prev_page" class="join-item btn btn-sm">
                                « Previous
                              </button>
                            <% end %>

                            <span class="join-item btn btn-sm btn-disabled">
                              Page <%= @current_page %>
                            </span>

                            <%= if @next_url do %>
                              <button phx-click="next_page" class="join-item btn btn-sm">
                                Next »
                              </button>
                            <% end %>
                          </div>
                        </div>
                      <% end %>
                    </div>
                  </div>
                <% end %>

                <!-- No Results Found Message -->
                <%= if @search_performed && @search_query != "" && length(@search_results) == 0 && !@loading do %>
                  <div class="text-center py-12">
                    <h3 class="text-xl font-semibold mb-4">No Results Found</h3>
                    <p class="text-base-content/70">
                      No recipes found matching "<%= @search_query %>". Try searching for a different term or check your spelling.
                    </p>
                  </div>
                <% end %>
              </div>

              <!-- Error Display -->
              <%= if @error do %>
                <div class="alert alert-error">
                  <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span><%= @error %></span>
                </div>
              <% end %>
            </div>
          </main>
        </div>
      </div>

      <.footer current_path={@current_path} />
      <.flash_group flash={@flash} />

      <!-- Quantity Selection Modal -->
      <%= if @show_quantity_modal and @selected_item_for_quantity do %>
        <div class="modal modal-open">
          <div class="modal-box">
            <h3 class="font-bold text-lg">Select Quantity</h3>
            <p class="py-4">
              How much of "<%= @selected_item_for_quantity.item["label"] %>" did you consume?
            </p>

            <form phx-change="update_quantity_form" class="space-y-4">
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Quantity Type</legend>
                <select class="select select-bordered w-full" name="quantity_type">
                  <option value="servings" selected={@quantity_type == "servings"}>Servings</option>
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

              <div class="text-sm text-base-content/70">
                <p>Recipe serving size: <%= if @selected_item_for_quantity.item["yield"], do: "#{@selected_item_for_quantity.item["yield"]} servings", else: "1 serving" %></p>
              </div>

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
