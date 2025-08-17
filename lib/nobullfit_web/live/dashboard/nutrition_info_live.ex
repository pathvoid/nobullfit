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

  defp round_nutrient_value(value), do: "#{value}"

  # Helper function to format decimal values for query parameters
  defp format_decimal(value) when is_struct(value, Decimal) do
    Decimal.round(value, 2) |> Decimal.to_string()
  end

  defp format_decimal(value) when is_integer(value) or is_float(value) do
    Decimal.new("#{value}") |> Decimal.round(2) |> Decimal.to_string()
  end

  defp format_decimal(_), do: ""

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
      # Add to favorites - get complete nutrition data including servingSizes
      ingredients = [
        %{
          foodId: food_id,
          measureURI: measure_uri,
          quantity: 100.0  # Use 100g as base for serving sizes
        }
      ]

      case NoBullFit.FoodAPI.get_nutrients(ingredients) do
        {:ok, complete_nutrition_data} ->
          # Add the food label to the nutrition data
          complete_nutrition_data = Map.put(complete_nutrition_data, "food_label", food_label)

          case UserFavorites.create_food_favorite(user_id, food_id, food_label, complete_nutrition_data, measure_uri, 100) do
            {:ok, _favorite} ->
              {:noreply,
               socket
               |> assign(is_favorited: true)
               |> put_flash(:info, "Added to favorites")}

            {:error, _changeset} ->
              {:noreply, put_flash(socket, :error, "Failed to add to favorites")}
          end

        {:error, error} ->
          {:noreply, put_flash(socket, :error, "Failed to get nutrition data: #{error}")}
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
      measures: socket.assigns.nutrition_data["servingSizes"] || []
    }

    # Calculate initial adjusted nutrition for 1 gram
    initial_nutrition = calculate_adjusted_nutrition(%{type: "food", item: food_item}, "grams", "1")

    # Show quantity modal for food
    {:noreply,
     assign(socket,
       show_quantity_modal: true,
       selected_item_for_quantity: %{type: "food", item: food_item},
       quantity_value: "1",
       quantity_type: "grams",
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
        quantity = case Float.parse(socket.assigns.quantity_value) do
          {value, _} -> value
          :error -> 1.0
        end

        # Parse the quantity type to get the base measurement and display text
        {base_quantity, display_text} = case socket.assigns.quantity_type do
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

    {:noreply, assign(socket,
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
        quantity = case Float.parse(quantity_value) do
          {value, _} -> value
          :error -> 1.0
        end

        # Parse the quantity type to get the base measurement
        {base_quantity, _display_text} = case quantity_type do
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
      Map.get(params, "measure_uri", "http://www.edamam.com/ontologies/edamam.owl#Measure_gram")

    ingredients = [
      %{
        foodId: food_id,
        measureURI: measure_uri,
        quantity: String.to_integer(quantity) * 1.0
      }
    ]

    # Start fetching nutrition data immediately
    send(self(), {:get_nutrition, ingredients, food_label})

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
  def handle_info({:get_nutrition, ingredients, food_label}, socket) do
    case NoBullFit.FoodAPI.get_nutrients(ingredients) do
      {:ok, data} ->
        # Add the food label to the nutrition data
        nutrition_data_with_label = Map.put(data, "food_label", food_label)

        # Check if this food is already favorited
        is_favorited = UserFavorites.is_favorited?(socket.assigns.current_scope.user.id, "food", socket.assigns.food_id, food_label)

        {:noreply, assign(socket, nutrition_data: nutrition_data_with_label, loading: false, is_favorited: is_favorited)}

      {:error, error} ->
        {:noreply,
         assign(socket,
           error: "Failed to get nutrition data: #{error}",
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
                          class="btn btn-sm btn-primary"
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
                    <option value="grams" selected={@quantity_type == "grams"}>Grams</option>
                    <option value="servings" selected={@quantity_type == "servings"}>Servings (<%= @selected_item_for_quantity.item.quantity %>g each)</option>
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

              <div class="text-sm text-base-content/70">
                <%= if @selected_item_for_quantity.item.measures && length(@selected_item_for_quantity.item.measures) > 0 do %>
                  <p>Available measurements:</p>
                  <ul class="list-disc list-inside ml-2">
                    <%= for measure <- @selected_item_for_quantity.item.measures do %>
                      <li><%= measure["label"] %> (<%= measure["weight"] %>g)</li>
                    <% end %>
                  </ul>
                <% else %>
                  <p>Original serving size: <%= @selected_item_for_quantity.item.quantity %>g</p>
                <% end %>
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
