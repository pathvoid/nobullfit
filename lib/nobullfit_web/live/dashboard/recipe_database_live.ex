defmodule NobullfitWeb.Dashboard.RecipeDatabaseLive do
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
        page_history: []
      )}
  end

  @impl true
  def handle_event("search", %{"query" => query}, socket) do
    if String.length(query) >= 2 do
      send(self(), {:perform_search, query, nil})
      {:noreply, assign(socket, search_query: query, loading: true, error: nil, current_page: 1)}
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
        send(self(), {:perform_search, socket.assigns.search_query, nil})
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
      {:noreply, assign(socket, loading: true, error: nil, current_page: socket.assigns.current_page + 1)}
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
          send(self(), {:perform_search, socket.assigns.search_query, nil})
          {:noreply, assign(socket, loading: true, error: nil, current_page: 1)}
        _ ->
          # Use the previous URL for navigation
          send(self(), {:perform_search_url, socket.assigns.prev_url, socket.assigns.current_page - 1})
          {:noreply, assign(socket, loading: true, error: nil, current_page: socket.assigns.current_page - 1)}
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
        page_history: []
      )}
  end

  @impl true
  def handle_info({:perform_search, query, _page}, socket) do
    case NoBullFit.RecipeAPI.search_recipes(q: query) do
      {:ok, data} ->
        # Filter out recipes without URLs
        filtered_results = Enum.filter(data["hits"] || [], fn hit ->
          recipe = hit["recipe"]
          recipe["url"] && recipe["url"] != ""
        end)

        # Extract next URL from the response
        links = data["_links"] || %{}
        next_url = if links["next"], do: links["next"]["href"], else: nil

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
            page_history: []
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
        filtered_results = Enum.filter(data["hits"] || [], fn hit ->
          recipe = hit["recipe"]
          recipe["url"] && recipe["url"] != ""
        end)

        # Extract next URL from the response
        links = data["_links"] || %{}
        next_url = if links["next"], do: links["next"]["href"], else: nil

        # For pages beyond the first, we should have a previous URL
        # We'll use a special marker to indicate going back to page 1
        prev_url = if page > 1, do: "page_1", else: nil

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
            page_history: []
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
                    <button phx-click="clear_search" class="btn btn-sm btn-ghost">Clear</button>
                  </div>

                  <form phx-submit="search" class="space-y-6">
                    <fieldset class="fieldset">
                      <legend class="fieldset-legend">Search Query</legend>
                      <input
                        type="text"
                        name="query"
                        value={@search_query}
                        placeholder="Enter recipe name, ingredients, or cuisine..."
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
                            Found <%= @total_count %> recipes matching your search query. Showing <%= @from %>-<%= @to %>.
                          <% end %>
                        </:subtitle>
                      </.header>

                      <div class="overflow-x-auto">
                        <table class="table table-zebra" id={"recipe-table-#{@current_page}"}>
                          <!-- head -->
                          <thead>
                            <tr>
                              <th>Recipe Name</th>
                              <th>Calories</th>
                              <th>Diet Labels</th>
                            </tr>
                          </thead>
                          <tbody>
                            <%= if @loading do %>
                              <tr>
                                <td colspan="3" class="text-center py-8">
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
                                  </td>
                                  <td>
                                    <div class="text-sm">
                                      <%= result["recipe"]["calories"] |> round() %> kcal
                                    </div>
                                  </td>
                                  <td>
                                    <%= if result["recipe"]["dietLabels"] && length(result["recipe"]["dietLabels"]) > 0 do %>
                                      <div class="flex flex-wrap gap-1">
                                        <%= for label <- result["recipe"]["dietLabels"] do %>
                                          <span class="badge badge-primary badge-xs"><%= label %></span>
                                        <% end %>
                                      </div>
                                    <% else %>
                                      <span class="text-base-content/50 text-sm">None</span>
                                    <% end %>
                                  </td>
                                </tr>
                              <% end %>
                            <% end %>
                          </tbody>
                        </table>
                      </div>

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

                <!-- No Results Message -->
                <%= if @search_query != "" && length(@search_results) == 0 do %>
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
    </div>
    """
  end
end
