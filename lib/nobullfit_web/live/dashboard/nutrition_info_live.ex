defmodule NobullfitWeb.Dashboard.NutritionInfoLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.CoreComponents
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]
  import NobullfitWeb.Components.Sidebar, only: [sidebar: 1]
  import NobullfitWeb.Layouts, only: [flash_group: 1]

  on_mount {NobullfitWeb.UserAuth, :require_authenticated}

  alias Nobullfit.UserFavorites

  # Helper function to format health labels
  defp format_health_label(label) do
    label
    |> String.replace("_", " ")
    |> String.downcase()
    |> String.capitalize()
  end

  # Helper function to round nutrient values
  defp round_nutrient_value(value) when is_number(value) do
    float_value = value * 1.0
    rounded = Float.round(float_value, 1)

    if rounded == Float.round(float_value, 0) do
      "#{trunc(value)}"
    else
      "#{rounded}"
    end
  end

  defp round_nutrient_value(value) when is_binary(value) do
    case Float.parse(value) do
      {float_value, _} ->
        rounded = Float.round(float_value, 1)
        if rounded == Float.round(float_value, 0) do
          "#{trunc(float_value)}"
        else
          "#{rounded}"
        end
      :error -> "#{value}"
    end
  end

  defp round_nutrient_value(value) when is_struct(value, Decimal) do
    float_value = Decimal.to_float(value)
    rounded = Float.round(float_value, 1)
    if rounded == Float.round(float_value, 0) do
      "#{trunc(float_value)}"
    else
      "#{rounded}"
    end
  end

  defp round_nutrient_value(value), do: "#{value}"

  # Helper function to format decimal values for query parameters
  defp format_decimal(value) do
    if is_struct(value, Decimal) do
      Decimal.round(value, 2) |> Decimal.to_string()
    else
      try do
        Decimal.new("#{value}") |> Decimal.round(2) |> Decimal.to_string()
      rescue
        _ -> ""
      end
    end
  end

  @impl true
  def handle_event("toggle_favorite", _params, socket) do
    user_id = socket.assigns.current_scope.user.id
    food_id = socket.assigns.food_id
    food_label = socket.assigns.food_label
    measure_uri = socket.assigns.measure_uri

    if socket.assigns.is_favorited do
      # Remove from favorites
      case UserFavorites.delete_user_favorite_by_external_id(user_id, "food", food_id, food_label) do
        {:ok, _} ->
          {:noreply,
           socket
           |> assign(is_favorited: false)
           |> put_flash(:info, "Removed from favorites")}

        {:error, _} ->
          {:noreply, put_flash(socket, :error, "Failed to remove from favorites")}
      end
    else
      # Add to favorites - use the current nutrition data and serving size
      # Get the actual serving size from the current nutrition data
      actual_quantity = socket.assigns.nutrition_data["totalWeight"] || 100.0
      # Convert to integer as expected by the schema
      quantity_int = trunc(actual_quantity)
      # Get available measures from nutrition data
      available_measures = socket.assigns.nutrition_data["available_measures"] || socket.assigns.nutrition_data["servingSizes"] || []

      case UserFavorites.create_food_favorite(user_id, food_id, food_label, socket.assigns.nutrition_data, measure_uri, quantity_int, available_measures) do
        {:ok, _favorite} ->
          {:noreply,
           socket
           |> assign(is_favorited: true)
           |> put_flash(:info, "Added to favorites")}

        {:error, _changeset} ->
          {:noreply, put_flash(socket, :error, "Failed to add to favorites")}
      end
    end
  end

  @impl true
  def handle_event("add_to_food_log", _params, socket) do
    # Create a food item structure similar to what we have in favorites
    food_item = %{
      name: socket.assigns.food_label,
      quantity: socket.assigns.nutrition_data["totalWeight"] || 100,
      calories: socket.assigns.nutrition_data["calories"],
      protein: if(socket.assigns.nutrition_data["totalNutrients"]["PROCNT"], do: Decimal.new("#{socket.assigns.nutrition_data["totalNutrients"]["PROCNT"]["quantity"]}"), else: nil),
      carbs: if(socket.assigns.nutrition_data["totalNutrients"]["CHOCDF"], do: Decimal.new("#{socket.assigns.nutrition_data["totalNutrients"]["CHOCDF"]["quantity"]}"), else: nil),
      fat: if(socket.assigns.nutrition_data["totalNutrients"]["FAT"], do: Decimal.new("#{socket.assigns.nutrition_data["totalNutrients"]["FAT"]["quantity"]}"), else: nil),
      measures: socket.assigns.nutrition_data["available_measures"] || socket.assigns.nutrition_data["servingSizes"] || []
    }

    # Get the default serving size from measures if available
    default_serving =
      if length(food_item.measures) > 0 do
        first_measure = List.first(food_item.measures)
        "#{first_measure["weight"]}_#{first_measure["label"]}"
      else
        # If no measures available, use servings instead of grams
        "servings"
      end

    # Calculate initial adjusted nutrition for 1 serving
    initial_nutrition = calculate_adjusted_nutrition(%{type: "food", item: food_item}, default_serving, "1")

    # Show quantity modal for food
    {:noreply,
     assign(socket,
       show_quantity_modal: true,
       selected_item_for_quantity: %{type: "food", item: food_item},
       quantity_value: "1",
       quantity_type: default_serving,
       adjusted_nutrition: initial_nutrition
     )}
  end

  @impl true
  def handle_event("hide_quantity_modal", _params, socket) do
    {:noreply,
     assign(socket,
       show_quantity_modal: false,
       selected_item_for_quantity: nil,
       quantity_value: "1",
       quantity_type: "grams"
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
           quantity_type: "grams"
         )
         |> push_navigate(to: "/d/add-food?#{query_string}", replace: false)
        }

      _ ->
        {:noreply, socket}
    end
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

        # Calculate the total quantity in grams
        total_grams = quantity * base_quantity

        # Calculate proportion for nutrition values (always based on grams)
        # food.quantity is the total weight from the nutrition data
        proportion = total_grams / food.quantity

        # Return adjusted nutrition values
        %{
          calories: if(food.calories, do: trunc(food.calories * proportion), else: nil),
          protein: if(food.protein, do: format_decimal(Decimal.mult(food.protein, Decimal.new("#{proportion}"))), else: nil),
          carbs: if(food.carbs, do: format_decimal(Decimal.mult(food.carbs, Decimal.new("#{proportion}"))), else: nil),
          fat: if(food.fat, do: format_decimal(Decimal.mult(food.fat, Decimal.new("#{proportion}"))), else: nil)
        }

      _ ->
        %{calories: nil, protein: nil, carbs: nil, fat: nil}
    end
  end

  @impl true
  def mount(
        %{"food_id" => food_id, "food_label" => food_label, "quantity" => quantity} = params,
        session,
        socket
      ) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})

    measure_uri =
      case Map.get(params, "measure_uri") do
        nil -> "http://www.edamam.com/ontologies/edamam.owl#Measure_gram"
        uri ->
          # Properly decode the URI using the same encoding function
          URI.decode(uri)
      end

    # Parse the quantity from URL (this is the weight in grams)
    quantity_in_grams =
      case Float.parse(quantity) do
        {float_value, _} -> float_value
        :error ->
          case Integer.parse(quantity) do
            {int_value, _} -> int_value * 1.0
            :error -> 100.0
          end
      end

    # For the API, we need to calculate how many units of the selected measure
    # For example, if we want 250g and the serving is 84g, we need 250/84 = ~2.98 servings
    api_quantity =
      if measure_uri == "http://www.edamam.com/ontologies/edamam.owl#Measure_gram" do
        # For grams, quantity is direct
        quantity_in_grams
      else
        # For other measures, we'll use 1 unit and adjust later if needed
        # This is safer than trying to calculate without knowing the exact measure weight
        1.0
      end

    ingredients = [
      %{
        foodId: food_id,
        measureURI: measure_uri,
        quantity: api_quantity
      }
    ]

    # Start fetching nutrition data immediately
    send(self(), {:get_nutrition, ingredients, food_label, food_id})

    {:ok,
     assign(socket,
       page_title: "Nutrition Information - #{food_label}",
       current_path: "/d/nutrition-info",
       maintenance_status: maintenance_status,
       nutrition_data: nil,
       loading: true,
       error: nil,
       food_id: food_id,
       food_label: food_label,
       measure_uri: measure_uri,
       quantity: quantity,
       is_favorited: false,
       show_quantity_modal: false,
       selected_item_for_quantity: nil,
       quantity_value: "1",
       quantity_type: "grams",
       adjusted_nutrition: %{calories: nil, protein: nil, carbs: nil, fat: nil}
     )}
  end

  @impl true
  def handle_info({:get_nutrition, ingredients, food_label, food_id}, socket) do
    # First get the nutrition data
    case NoBullFit.FoodAPI.get_nutrients(ingredients) do
      {:ok, data} ->
        # Add the food label to the nutrition data
        nutrition_data_with_label = Map.put(data, "food_label", food_label)

        # Now try to get measures data by searching for the food
        # Extract just the food name from the label for a cleaner search
        search_query = String.split(food_label, ",") |> List.first() |> String.trim()

        # Try to get measures from a fresh search
        case NoBullFit.FoodAPI.search_foods(search_query) do
          {:ok, search_data} ->
            # Look for the same food in the search results
            all_results = (search_data["parsed"] || []) ++ (search_data["hints"] || [])

            # First try to find exact match by foodId
            matching_food = Enum.find(all_results, fn item ->
              item["food"]["foodId"] == food_id
            end)

            # If no exact match, try to find by name similarity
            matching_food =
              if matching_food do
                matching_food
              else
                Enum.find(all_results, fn item ->
                  String.downcase(item["food"]["label"]) == String.downcase(food_label)
                end)
              end

            available_measures =
              if matching_food do
                measures = matching_food["measures"] || [matching_food["measure"]]
                # Filter out nil measures and ensure we have at least one measure
                filtered_measures = Enum.filter(measures, &(&1 != nil))
                if length(filtered_measures) > 0 do
                  filtered_measures
                else
                  # If no measures found, create a default serving measure based on totalWeight
                  [%{
                    "label" => "Serving",
                    "weight" => data["totalWeight"] || 100.0,
                    "uri" => "http://www.edamam.com/ontologies/edamam.owl#Measure_serving"
                  }]
                end
              else
                # If no matching food found, create a default serving measure
                [%{
                  "label" => "Serving",
                  "weight" => data["totalWeight"] || 100.0,
                  "uri" => "http://www.edamam.com/ontologies/edamam.owl#Measure_serving"
                }]
              end

            nutrition_data_with_measures = Map.put(nutrition_data_with_label, "available_measures", available_measures)

            # Check if this food is already favorited
            is_favorited = UserFavorites.is_favorited?(socket.assigns.current_scope.user.id, "food", socket.assigns.food_id, food_label)

            {:noreply, assign(socket, nutrition_data: nutrition_data_with_measures, loading: false, is_favorited: is_favorited)}

          {:error, _} ->
            # If search fails, create a default serving measure based on totalWeight
            default_measures = [%{
              "label" => "Serving",
              "weight" => data["totalWeight"] || 100.0,
              "uri" => "http://www.edamam.com/ontologies/edamam.owl#Measure_serving"
            }]
            nutrition_data_with_measures = Map.put(nutrition_data_with_label, "available_measures", default_measures)
            is_favorited = UserFavorites.is_favorited?(socket.assigns.current_scope.user.id, "food", socket.assigns.food_id, food_label)
            {:noreply, assign(socket, nutrition_data: nutrition_data_with_measures, loading: false, is_favorited: is_favorited)}
        end

      {:error, error} ->
        {:noreply,
         assign(socket,
           error: "Failed to get nutrition data: #{error}",
           loading: false
         )}
    end
  end

  # Fallback for backwards compatibility
  @impl true
  def handle_info({:get_nutrition, ingredients, food_label}, socket) do
    # For backwards compatibility, use food_label as a fallback food_id
    send(self(), {:get_nutrition, ingredients, food_label, "unknown"})
    {:noreply, socket}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-base-100 flex flex-col">
      <.navigation current_scope={@current_scope} current_path={@current_path} maintenance_status={@maintenance_status} user_agent={@user_agent} />

      <div class="flex flex-1">
        <.sidebar current_path={@current_path} />

        <div class="flex-1">
          <main class="px-4 py-8 md:py-12">
            <div class="max-w-4xl mx-auto space-y-8">
              <.header centered={true}>
                Nutrition Information
                <:subtitle>Detailed nutrition analysis for your selected food</:subtitle>
              </.header>

              <!-- Loading State -->
              <%= if @loading do %>
                <div class="card bg-base-200">
                  <div class="card-body text-center">
                    <div class="loading loading-spinner loading-lg"></div>
                    <p class="mt-4 text-base-content/70">Loading nutrition information...</p>
                  </div>
                </div>
              <% end %>

              <!-- Nutrition Results -->
              <%= if @nutrition_data do %>
                <div class="card bg-base-200">
                  <div class="card-body">
                    <div class="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-6">
                      <div>
                        <h3 class="card-title text-2xl">Nutrition Information</h3>
                        <p class="text-sm text-base-content/70 mt-2">
                          Showing nutrition data for:
                          <span class="font-medium"><%= @nutrition_data["food_label"] || "Unknown food" %></span>
                        </p>
                      </div>
                      <div class="flex flex-col sm:flex-row gap-2">
                        <button
                          phx-click="add_to_food_log"
                          class="btn btn-sm btn-info"
                          title="Add to food log"
                        >
                          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                          </svg>
                          Add to Log
                        </button>
                        <button
                          phx-click="toggle_favorite"
                          class={[
                            "btn btn-sm",
                            if(@is_favorited, do: "btn-primary", else: "btn-ghost")
                          ]}
                        >
                          <%= if @is_favorited do %>
                            <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path>
                            </svg>
                            Favorited
                          <% else %>
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                            </svg>
                            Add to Favorites
                          <% end %>
                        </button>
                        <a href="/d/food-database" class="btn btn-sm btn-ghost">
                          ← Back to Food Database
                        </a>
                      </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div class="stat bg-base-300 rounded-lg">
                        <div class="stat-title">Total Calories</div>
                        <div class="stat-value text-primary"><%= round_nutrient_value(@nutrition_data["calories"]) %></div>
                      </div>
                      <div class="stat bg-base-300 rounded-lg">
                        <div class="stat-title">Total Weight</div>
                        <div class="stat-value text-primary"><%= round_nutrient_value(@nutrition_data["totalWeight"]) %>g</div>
                      </div>
                    </div>

                    <%= if @nutrition_data["dietLabels"] && length(@nutrition_data["dietLabels"]) > 0 do %>
                      <div class="mb-6">
                        <h4 class="font-semibold mb-3">Diet Labels:</h4>
                        <div class="flex flex-wrap gap-2">
                          <%= for label <- @nutrition_data["dietLabels"] do %>
                            <span class="badge badge-primary"><%= label %></span>
                          <% end %>
                        </div>
                      </div>
                    <% end %>

                    <%= if @nutrition_data["healthLabels"] && length(@nutrition_data["healthLabels"]) > 0 do %>
                      <div class="mb-6">
                        <h4 class="font-semibold mb-3">Health Labels:</h4>
                        <div class="flex flex-wrap gap-2">
                          <%= for label <- @nutrition_data["healthLabels"] do %>
                            <span class="badge badge-secondary"><%= format_health_label(label) %></span>
                          <% end %>
                        </div>
                      </div>
                    <% end %>

                    <%= if @nutrition_data["totalNutrients"] do %>
                      <div>
                        <h4 class="font-semibold mb-3">Key Nutrients:</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <%= for {key, nutrient} <- @nutrition_data["totalNutrients"] do %>
                            <%= if key in ["ENERC_KCAL", "PROCNT", "CHOCDF", "FAT", "FIBTG", "SUGAR", "NA", "CA", "FE"] do %>
                              <div class="flex justify-between p-3 bg-base-300 rounded">
                                <span class="font-medium"><%= nutrient["label"] %></span>
                                <span><%= round_nutrient_value(nutrient["quantity"]) %><%= nutrient["unit"] %></span>
                              </div>
                            <% end %>
                          <% end %>
                        </div>
                      </div>
                    <% end %>
                  </div>
                </div>

                <!-- Edamam Attribution -->
                <div class="mt-8 flex justify-end">
                  <a href="https://www.edamam.com" title="Powered by Edamam" target="_blank">
                    <img alt="Powered by Edamam" src="https://developer.edamam.com/images/transparent.png" height="40" width="200" />
                  </a>
                </div>
              <% end %>

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
              How much of "<%= @selected_item_for_quantity.item.name %>" did you consume?
            </p>

            <form phx-change="update_quantity_form" class="space-y-4">
              <fieldset class="fieldset">
                <legend class="fieldset-legend">Quantity Type</legend>
                <select class="select select-bordered w-full" name="quantity_type">
                  <%= if @selected_item_for_quantity.item.measures && length(@selected_item_for_quantity.item.measures) > 0 do %>
                    <%= for measure <- @selected_item_for_quantity.item.measures do %>
                      <option value={"#{measure["weight"]}_#{measure["label"]}"} selected={@quantity_type == "#{measure["weight"]}_#{measure["label"]}"}>
                        <%= measure["label"] %> (<%= measure["weight"] %>g)
                      </option>
                    <% end %>
                  <% else %>
                    <option value="servings" selected={@quantity_type == "servings"}>Servings (<%= @selected_item_for_quantity.item.quantity %>g each)</option>
                    <option value="grams" selected={@quantity_type == "grams"}>Grams</option>
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
