defmodule NobullfitWeb.Dashboard.NutritionInfoLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.CoreComponents
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]
  import NobullfitWeb.Components.Sidebar, only: [sidebar: 1]
  import NobullfitWeb.Layouts, only: [flash_group: 1]

  on_mount {NobullfitWeb.UserAuth, :require_authenticated}

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

  @impl true
  def mount(%{"food_id" => food_id, "food_label" => food_label, "quantity" => quantity} = params, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})
    measure_uri = Map.get(params, "measure_uri", "http://www.edamam.com/ontologies/edamam.owl#Measure_gram")

    ingredients = [%{
      foodId: food_id,
      measureURI: measure_uri,
      quantity: String.to_integer(quantity) * 1.0
    }]

    # Start fetching nutrition data immediately
    send(self(), {:get_nutrition, ingredients, food_label})

    {:ok, assign(socket,
      page_title: "Nutrition Information - #{food_label}",
      current_path: "/d/nutrition-info",
      maintenance_status: maintenance_status,
      nutrition_data: nil,
      loading: true,
      error: nil
    )}
  end

  @impl true
  def handle_info({:get_nutrition, ingredients, food_label}, socket) do
    case NoBullFit.FoodAPI.get_nutrients(ingredients) do
      {:ok, data} ->
        # Add the food label to the nutrition data
        nutrition_data_with_label = Map.put(data, "food_label", food_label)
        {:noreply, assign(socket, nutrition_data: nutrition_data_with_label, loading: false)}
      {:error, error} ->
        {:noreply, assign(socket,
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
              <div class="text-center">
                <.header>
                  Nutrition Information
                  <:subtitle>Detailed nutrition analysis for your selected food</:subtitle>
                </.header>
              </div>

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
                    <div class="flex justify-between items-start mb-6">
                      <div>
                        <h3 class="card-title text-2xl">Nutrition Information</h3>
                        <p class="text-sm text-base-content/70 mt-2">
                          Showing nutrition data for: <span class="font-medium"><%= @nutrition_data["food_label"] || "Unknown food" %></span>
                        </p>
                      </div>
                      <a href="/d/food-database" class="btn btn-sm btn-ghost">
                        ← Back to Food Database
                      </a>
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
    </div>
    """
  end
end
