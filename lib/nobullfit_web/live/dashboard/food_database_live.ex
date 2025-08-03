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

    {:ok, assign(socket,
      page_title: "Food Database",
      current_path: "/d/food-database",
      maintenance_status: maintenance_status,
             search_query: "",
       search_results: [],
       hints: [],
       loading: false,
       error: nil
    )}
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
    %{"food_id" => food_id, "food_label" => food_label, "quantity" => quantity} = params
    measure_uri = Map.get(params, "measure_uri", "http://www.edamam.com/ontologies/edamam.owl#Measure_gram")

    # Navigate to nutrition info page
    nutrition_url = "/d/nutrition-info/#{food_id}/#{URI.encode(food_label)}/#{quantity}"
    final_url = if measure_uri != "http://www.edamam.com/ontologies/edamam.owl#Measure_gram" do
      nutrition_url <> "?measure_uri=#{URI.encode(measure_uri)}"
    else
      nutrition_url
    end

    {:noreply, push_navigate(socket, to: final_url)}
  end

  @impl true
  def handle_event("get_nutrition_from_hint", params, socket) do
    %{"food_id" => food_id, "food_label" => food_label} = params
    measure_uri = Map.get(params, "measure_uri", "http://www.edamam.com/ontologies/edamam.owl#Measure_gram")

    # Navigate to nutrition info page
    nutrition_url = "/d/nutrition-info/#{food_id}/#{URI.encode(food_label)}/100"
    final_url = if measure_uri != "http://www.edamam.com/ontologies/edamam.owl#Measure_gram" do
      nutrition_url <> "?measure_uri=#{URI.encode(measure_uri)}"
    else
      nutrition_url
    end

    {:noreply, push_navigate(socket, to: final_url)}
  end

  @impl true
  def handle_event("clear_search", _params, socket) do
    {:noreply, assign(socket,
      search_query: "",
      search_results: [],
      hints: [],
      nutrition_data: nil,
      error: nil
    )}
  end

  @impl true
  def handle_info({:perform_search, query}, socket) do
    case NoBullFit.FoodAPI.search_foods(query) do
      {:ok, data} ->
        {:noreply, assign(socket,
          search_results: data["parsed"] || [],
          hints: data["hints"] || [],
          loading: false
        )}
      {:error, error} ->
        {:noreply, assign(socket,
          error: "Search failed: #{error}",
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
              <div class="text-center">
                <.header>
                  Food Database
                  <:subtitle>Search and analyze nutrition information for foods</:subtitle>
                </.header>
              </div>

                             <!-- Search Section -->
               <div class="max-w-5xl mx-auto">
                 <div class="bg-base-200 rounded-lg p-10 mb-12">
                   <div class="flex justify-between items-center mb-6">
                     <.header>
                       Search Foods
                       <:subtitle>Enter a food name, brand, or UPC code to find nutrition information</:subtitle>
                     </.header>
                     <button phx-click="clear_search" class="btn btn-sm btn-ghost">Clear</button>
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
                 <%= if length(@search_results) > 0 do %>
                   <div class="max-w-5xl mx-auto">
                     <div class="bg-base-200 rounded-lg p-8">
                       <.header>
                         Search Results
                         <:subtitle>Found foods matching your search query. Click "Get Nutrition" to view detailed nutrition information.</:subtitle>
                       </.header>
                       <div class="grid grid-cols-1 gap-6">
                      <%= for {result, _index} <- Enum.with_index(@search_results) do %>
                                                 <div class="bg-base-100 rounded-lg p-6 border border-base-300 shadow-sm">
                           <div class="flex justify-between items-start mb-4">
                             <h4 class="text-lg font-semibold"><%= result["food"]["label"] %></h4>
                            <button
                              phx-click="get_nutrition"
                              phx-value-food_id={result["food"]["foodId"]}
                              phx-value-food_label={result["food"]["label"]}
                              phx-value-measure_uri={result["measure"]["uri"]}
                              phx-value-quantity="100"
                              class="btn btn-primary"
                              disabled={@loading}
                            >
                              Get Nutrition
                            </button>
                          </div>

                                                     <div class="space-y-3 mb-4">
                            <%= if result["food"]["brand"] do %>
                              <p class="text-base-content/70">Brand: <span class="font-medium"><%= result["food"]["brand"] %></span></p>
                            <% end %>

                            <%= if result["food"]["categoryLabel"] do %>
                              <p class="text-base-content/70">Category: <span class="font-medium"><%= result["food"]["categoryLabel"] %></span></p>
                            <% end %>

                            <%= if result["measure"] do %>
                              <p class="text-base-content/70">
                                Serving: <span class="font-medium"><%= result["measure"]["label"] %> (<%= result["measure"]["weight"] %>g)</span>
                              </p>
                            <% end %>
                          </div>

                          <%= if result["food"]["nutrients"] do %>
                            <div class="grid grid-cols-2 gap-4 text-sm">
                              <div class="bg-base-300 rounded p-3">
                                <p class="font-medium">Calories</p>
                                <p class="text-primary"><%= result["food"]["nutrients"]["ENERC_KCAL"] || "N/A" %> kcal</p>
                              </div>
                              <div class="bg-base-300 rounded p-3">
                                <p class="font-medium">Protein</p>
                                <p class="text-primary"><%= result["food"]["nutrients"]["PROCNT"] || "N/A" %>g</p>
                              </div>
                              <div class="bg-base-300 rounded p-3">
                                <p class="font-medium">Carbs</p>
                                <p class="text-primary"><%= result["food"]["nutrients"]["CHOCDF"] || "N/A" %>g</p>
                              </div>
                              <div class="bg-base-300 rounded p-3">
                                <p class="font-medium">Fat</p>
                                <p class="text-primary"><%= result["food"]["nutrients"]["FAT"] || "N/A" %>g</p>
                              </div>
                            </div>
                          <% end %>
                        </div>
                      <% end %>
                       </div>
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

                                                  <!-- Suggestions -->
                 <%= if @hints && length(@hints) > 0 do %>
                   <div class="mt-12">
                     <.header>
                       Suggestions
                       <:subtitle>Here are some similar foods you might be looking for:</:subtitle>
                     </.header>
                     <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <%= for hint <- @hints do %>
                                                 <div class="bg-base-100 rounded-lg p-6 border border-base-300 shadow-sm">
                           <div class="flex justify-between items-start">
                             <div class="flex-1">
                               <h4 class="text-base font-semibold mb-2"><%= hint["food"]["label"] %></h4>
                              <div class="space-y-1 text-sm">
                                <%= if hint["food"]["brand"] do %>
                                  <p class="text-base-content/70">Brand: <span class="font-medium"><%= hint["food"]["brand"] %></span></p>
                                <% end %>
                                <%= if hint["food"]["categoryLabel"] do %>
                                  <p class="text-base-content/70">Category: <span class="font-medium"><%= hint["food"]["categoryLabel"] %></span></p>
                                <% end %>
                              </div>
                            </div>
                            <button
                              phx-click="get_nutrition_from_hint"
                              phx-value-food_id={hint["food"]["foodId"]}
                              phx-value-food_label={hint["food"]["label"]}
                              phx-value-measure_uri={hint["measure"]["uri"]}
                              class="btn btn-primary"
                              disabled={@loading}
                            >
                              Get Nutrition
                            </button>
                          </div>
                        </div>
                      <% end %>
                    </div>
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
end
