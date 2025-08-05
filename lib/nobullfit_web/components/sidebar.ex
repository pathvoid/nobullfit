defmodule NobullfitWeb.Components.Sidebar do
  use Phoenix.Component
  use NobullfitWeb, :verified_routes

  # Helper function to determine if a sidebar link is active
  defp is_active_link?(current_path, href) do
    cond do
      # Overview link is active only when exactly on /d
      href == "/d" -> current_path == "/d"
      # Food Tracking link is active only when exactly on /d/food
      href == "/d/food" -> current_path == "/d/food"
      # Other links are active when current_path starts with href
      true -> String.starts_with?(current_path || "", href)
    end
  end

  # Helper function to determine if a parent menu should be open
  defp is_parent_open?(current_path, parent_paths) do
    Enum.any?(parent_paths, fn path -> String.starts_with?(current_path || "", path) end)
  end

  @doc """
  Renders a sidebar menu for the dashboard.
  """
  def sidebar(assigns) do
    ~H"""
    <div class="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-base-200 lg:bg-base-200/50 lg:backdrop-blur-sm">
      <div class="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
        <nav class="flex-1 px-2 space-y-1">
          <div class="space-y-2">
            <h3 class="px-3 text-xs font-semibold text-base-content/70 uppercase tracking-wider">
              Dashboard
            </h3>
            <div class="space-y-1">
              <.sidebar_link href={~p"/d"} current_path={@current_path} icon="home">
                Overview
              </.sidebar_link>
              <details class="group" open={is_parent_open?(@current_path, ["/d/food-database"])}>
                <summary class="flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors hover:bg-base-300">
                  <span class="mr-3 flex-shrink-0 h-5 w-5">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
                    </svg>
                  </span>
                  Database
                </summary>
                <ul class="mt-1 space-y-1 pl-4">
                  <li>
                    <.sidebar_link href={~p"/d/food-database"} current_path={@current_path} icon="search">
                      Food Database
                    </.sidebar_link>
                  </li>
                </ul>
              </details>
              <.sidebar_link href={~p"/d/food"} current_path={@current_path} icon="utensils">
                Food Tracking
              </.sidebar_link>
              <.sidebar_link href={~p"/d/progress"} current_path={@current_path} icon="chart-line">
                Progress
              </.sidebar_link>
              <.sidebar_link href={~p"/d/groceries"} current_path={@current_path} icon="shopping-cart">
                Groceries
              </.sidebar_link>
            </div>
          </div>
        </nav>
      </div>
    </div>
    """
  end

  defp sidebar_link(assigns) do
    ~H"""
    <.link
      href={@href}
      class={[
        "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
        if(is_active_link?(@current_path, @href), do: "bg-primary text-primary-content", else: "text-base-content hover:bg-base-300")
      ]}
    >
      <span class="mr-3 flex-shrink-0 h-5 w-5">
        <%= case @icon do %>
          <% "home" -> %>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
            </svg>
          <% "utensils" -> %>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
          <% "database" -> %>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
            </svg>
          <% "chart-line" -> %>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
          <% "search" -> %>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          <% "shopping-cart" -> %>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
            </svg>
        <% end %>
      </span>
      <%= render_slot(@inner_block) %>
    </.link>
    """
  end
end
