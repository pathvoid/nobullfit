defmodule NobullfitWeb.Dashboard.FoodDatabaseLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.CoreComponents
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]
  import NobullfitWeb.Components.Sidebar, only: [sidebar: 1]
  import NobullfitWeb.Layouts, only: [flash_group: 1]

  on_mount {NobullfitWeb.UserAuth, :require_authenticated}

  @impl true
  def mount(_params, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})

    {:ok,
      assign(socket,
        page_title: "Food Database",
        current_path: "/d/food-database",
        maintenance_status: maintenance_status,
        search_query: "",
        search_results: [],
        hints: [],
        loading: false,
        error: nil
      )
    }
  end

  @impl true
  def handle_event("search", %{"query" => query}, socket) do
    if String.length(query) >= 2 do
      send(self(), {:perform_search, query})
      {:noreply, assign(socket, search_query: query, loading: true, error: nil)}
    else
      {:noreply, assign(socket, search_query: query, search_results: [])}
    end
  end

  @impl true
  def handle_event("get_nutrition", params, socket) do
    %{"food_id" => food_id, "food_label" => food_label} = params

    # Try to get quantity from various possible parameter names, ensure it's not empty
    quantity =
      case Map.get(params, "quantity") || Map.get(params, "value") do
        nil -> "100"
        "" -> "100"
        qty -> qty
      end

    measure_uri = Map.get(params, "measure_uri", "http://www.edamam.com/ontologies/edamam.owl#Measure_gram")

    # Navigate to nutrition info page with clean URL
    nutrition_url = "/d/nutrition-info/#{food_id}/#{URI.encode(food_label)}/#{quantity}"

    final_url =
      if measure_uri != "http://www.edamam.com/ontologies/edamam.owl#Measure_gram" do
        # Properly encode the measure_uri, especially the # symbol
        encoded_measure_uri = URI.encode(measure_uri, &URI.char_unreserved?/1)
        nutrition_url <> "?measure_uri=#{encoded_measure_uri}"
      else
        nutrition_url
      end

    {:noreply, push_navigate(socket, to: final_url)}
  end

  @impl true
  def handle_event("get_nutrition_from_hint", params, socket) do
    %{"food_id" => food_id, "food_label" => food_label} = params
    measure_uri = Map.get(params, "measure_uri", "http://www.edamam.com/ontologies/edamam.owl#Measure_gram")

    # Navigate to nutrition info page with a reasonable default quantity
    nutrition_url = "/d/nutrition-info/#{food_id}/#{URI.encode(food_label)}/100"

    final_url =
      if measure_uri != "http://www.edamam.com/ontologies/edamam.owl#Measure_gram" do
        # Properly encode the measure_uri, especially the # symbol
        encoded_measure_uri = URI.encode(measure_uri, &URI.char_unreserved?/1)
        nutrition_url <> "?measure_uri=#{encoded_measure_uri}"
      else
        nutrition_url
      end

    {:noreply, push_navigate(socket, to: final_url)}
  end

  @impl true
  def handle_event("clear_search", _params, socket) do
    {:noreply,
      assign(socket,
        search_query: "",
        search_results: [],
        hints: [],
        nutrition_data: nil,
        error: nil
      )
    }
  end

  @impl true
  def handle_info({:perform_search, query}, socket) do
    case NoBullFit.FoodAPI.search_foods(query) do
      {:ok, data} ->
        # Use hints as the main results since they have multiple measurements
        # Also include parsed results if hints are empty
        main_results =
          if length(data["hints"] || []) > 0 do
            data["hints"] || []
          else
            data["parsed"] || []
          end

        {:noreply,
          assign(socket,
            search_results: main_results,
            hints: data["hints"] || [],
            loading: false
          )
        }

      {:error, error} ->
        {:noreply,
          assign(socket,
            error: "Search failed: #{error}",
            loading: false
          )
        }
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
                Food Database
                <:subtitle>Search and analyze nutrition information for foods</:subtitle>
              </.header>

              <!-- Search Section -->
              <div class="max-w-5xl mx-auto">
                <div class="bg-base-200 rounded-lg p-10 mb-12">
                  <div class="flex justify-between items-center mb-6">
                    <.header>
                      Search Foods
                      <:subtitle>Enter a food name, brand, or UPC code to find nutrition information</:subtitle>
                    </.header>
                    <button phx-click="clear_search" class="btn btn-sm btn-ghost hidden md:inline-flex">Clear</button>
                  </div>

                  <form phx-submit="search" class="space-y-6">
                    <fieldset class="fieldset">
                      <legend class="fieldset-legend">Search Query</legend>
                      <input
                        type="text"
                        name="query"
                        value={@search_query}
                        placeholder="Enter food name, brand, or UPC..."
                        class="input input-bordered w-full"
                        autocomplete="off"
                      />
                    </fieldset>

                    <button type="submit" class="btn btn-primary w-full" disabled={@loading}>
                      <%= if @loading do %>
                        <span class="loading loading-spinner loading-sm"></span>
                      <% end %>
                      Search
                    </button>
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
                            Found <%= length(@search_results) %> foods matching your search query. Click "Get Nutrition" to view detailed nutrition information.
                          <% end %>
                        </:subtitle>
                      </.header>

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
                          <%= if @loading do %>
                            <tr>
                              <td colspan="5" class="text-center py-8">
                                <div class="flex items-center justify-center">
                                  <span class="loading loading-spinner loading-md"></span>
                                  <span class="ml-2">Loading foods...</span>
                                </div>
                              </td>
                            </tr>
                          <% else %>
                            <%= for {result, index} <- Enum.with_index(@search_results) do %>
                              <% measures = result["measures"] || [result["measure"]] %>
                              <% default_measure = List.first(measures) %>
                              <tr id={"food-row-#{index}"}>
                                <td>
                                  <div class="flex items-center gap-3">
                                    <div>
                                      <div class="font-bold"><%= result["food"]["label"] %></div>
                                      <div class="text-sm opacity-50">
                                        <%= if result["food"]["brand"] do %>
                                          <%= result["food"]["brand"] %>
                                        <% else %>
                                          Generic food
                                        <% end %>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td class="hidden md:table-cell">
                                  <%= if default_measure do %>
                                    <div class="text-sm font-medium">
                                      <%= default_measure["label"] %>
                                    </div>
                                    <div class="text-xs opacity-70"><%= default_measure["weight"] %>g</div>
                                  <% else %>
                                    <div class="text-sm font-medium">100g</div>
                                    <div class="text-xs opacity-70">default</div>
                                  <% end %>
                                </td>
                                <td class="hidden lg:table-cell">
                                  <%= if result["food"]["nutrients"] do %>
                                    <div class="text-xs space-y-1">
                                      <%= if result["food"]["nutrients"]["ENERC_KCAL"] do %>
                                        <div>Calories: <span class="font-medium"><%= round_nutrient_value(result["food"]["nutrients"]["ENERC_KCAL"]) %> kcal</span></div>
                                      <% end %>
                                      <%= if result["food"]["nutrients"]["PROCNT"] do %>
                                        <div>Protein: <span class="font-medium"><%= round_nutrient_value(result["food"]["nutrients"]["PROCNT"]) %>g</span></div>
                                      <% end %>
                                      <%= if result["food"]["nutrients"]["CHOCDF"] do %>
                                        <div>Carbs: <span class="font-medium"><%= round_nutrient_value(result["food"]["nutrients"]["CHOCDF"]) %>g</span></div>
                                      <% end %>
                                      <%= if result["food"]["nutrients"]["FAT"] do %>
                                        <div>Fat: <span class="font-medium"><%= round_nutrient_value(result["food"]["nutrients"]["FAT"]) %>g</span></div>
                                      <% end %>
                                    </div>
                                  <% else %>
                                    <span class="text-base-content/50 text-sm">Not available</span>
                                  <% end %>
                                </td>
                                <th>
                                  <button
                                    phx-click="get_nutrition"
                                    phx-value-food_id={result["food"]["foodId"]}
                                    phx-value-food_label={result["food"]["label"]}
                                    phx-value-measure_uri={if default_measure, do: default_measure["uri"], else: "http://www.edamam.com/ontologies/edamam.owl#Measure_gram"}
                                    phx-value-quantity={if default_measure, do: default_measure["weight"] |> to_string(), else: "100"}
                                    class="btn btn-primary btn-xs"
                                    disabled={@loading}
                                  >
                                    Get Nutrition
                                  </button>
                                </th>
                              </tr>
                            <% end %>
                          <% end %>
                        </tbody>
                      </table>
                    </div>
                  </div>
                <% end %>

                <!-- No Results Message -->
                <%= if @search_query != "" && length(@search_results) == 0 do %>
                  <div class="text-center py-12">
                    <h3 class="text-xl font-semibold mb-4">No Results Found</h3>
                    <p class="text-base-content/70">
                      No foods found matching "<%= @search_query %>". Try searching for a different term or check your spelling.
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
    </div>
    """
  end

  # Helper function to round nutrient values to max 2 decimals
  defp round_nutrient_value(value) when is_number(value) do
    Float.round(value, 2)
  end

  defp round_nutrient_value(value) when is_binary(value) do
    case Float.parse(value) do
      {float_value, _} -> Float.round(float_value, 2)
      :error -> value
    end
  end

  defp round_nutrient_value(value) when is_struct(value, Decimal) do
    Decimal.to_float(value) |> Float.round(2)
  end

  defp round_nutrient_value(value), do: value
end
