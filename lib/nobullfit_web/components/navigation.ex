defmodule NobullfitWeb.Components.Navigation do
  use Phoenix.Component
  import NobullfitWeb.Layouts, only: [theme_toggle: 1]
  import NobullfitWeb.Components.MaintenanceBanner, only: [maintenance_banner: 1]
  import NobullfitWeb.Helpers.AppDetection, only: [is_nobullfit_app?: 1]

  use NobullfitWeb, :verified_routes

  def navigation(assigns) do
    assigns = assign_new(assigns, :user_agent, fn -> "" end)

    ~H"""
    <div phx-hook="NavigationPreload" id="navigation">
      <div class="drawer lg:hidden">
        <input id="mobile-drawer" type="checkbox" class="drawer-toggle" />
        <div class="drawer-content">
          <nav class="navbar bg-base-200/50 backdrop-blur-sm border-b border-base-200" style="z-index: 999999;">
            <div class="navbar-start">
              <label for="mobile-drawer" class="btn btn-ghost btn-sm">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </label>
            </div>

            <div class="navbar-center hidden lg:flex">
              <%= unless String.starts_with?(@current_path || "", "/d") or
                      (String.starts_with?(@current_path || "", "/users") and
                        not String.starts_with?(@current_path || "", "/users/log-in") and
                        not String.starts_with?(@current_path || "", "/users/register")) or
                      is_nobullfit_app?(@user_agent) do %>
                <ul class="menu menu-horizontal gap-2">
                  <li><a href="/" class="btn btn-ghost btn-sm">Home</a></li>
                  <li><a href="/guides" class="btn btn-ghost btn-sm">Guides</a></li>
                  <li><a href="/about" class="btn btn-ghost btn-sm">About</a></li>
                </ul>
              <% end %>
            </div>

            <div class="navbar-end">
              <div class="hidden lg:block">
                <.theme_toggle />
              </div>
              <div class="hidden lg:block ml-4">
                <%= if @current_scope && @current_scope.user do %>
                  <div class="flex gap-2">
                    <%= if String.starts_with?(@current_path || "", "/d") do %>
                      <.link href={~p"/users/settings"} class="btn btn-ghost btn-sm">Settings</.link>
                    <% else %>
                      <a href="/d" class="btn btn-ghost btn-sm">Dashboard</a>
                    <% end %>
                    <.link href={~p"/users/log-out"} method="delete" class="btn btn-ghost btn-sm">Log out</.link>
                  </div>
                <% else %>
                  <div class="flex gap-2">
                    <a href="/users/log-in" class="btn btn-ghost btn-sm">Log in</a>
                    <a href="/users/register" class="btn btn-ghost btn-sm">Register</a>
                  </div>
                <% end %>
              </div>
              <!-- Mobile auth links -->
              <div class="lg:hidden flex gap-2">
                <%= if @current_scope && @current_scope.user do %>
                  <%= if String.starts_with?(@current_path || "", "/d") do %>
                    <.link href={~p"/users/settings"} class="btn btn-ghost btn-sm">Settings</.link>
                  <% else %>
                    <a href="/d" class="btn btn-ghost btn-sm">Dashboard</a>
                  <% end %>
                <% else %>
                  <a href="/users/log-in" class="btn btn-ghost btn-sm">Log in</a>
                  <a href="/users/register" class="btn btn-ghost btn-sm">Register</a>
                <% end %>
              </div>
            </div>
          </nav>
        </div>

        <div class="drawer-side" style="z-index: 99999;">
          <label for="mobile-drawer" aria-label="close sidebar" class="drawer-overlay" style="z-index: 99998;"></label>
          <div class="relative w-80 min-h-full bg-base-200 text-base-content" style="z-index: 99999;">
            <label for="mobile-drawer" class="btn btn-ghost btn-sm absolute top-4 right-4" style="z-index: 999999;">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </label>
            <ul class="menu p-4 w-full min-h-full" style="z-index: 99999;">
              <li class="menu-title">
                <span>NoBullFit</span>
              </li>
              <%= unless String.starts_with?(@current_path || "", "/d") or
                      (String.starts_with?(@current_path || "", "/users") and
                        not String.starts_with?(@current_path || "", "/users/log-in") and
                        not String.starts_with?(@current_path || "", "/users/register")) or
                      is_nobullfit_app?(@user_agent) do %>
                <li><a href="/" class="text-lg">Home</a></li>
                <li><a href="/guides" class="text-lg">Guides</a></li>
                <li><a href="/about" class="text-lg">About</a></li>
              <% end %>
              <%= if String.starts_with?(@current_path || "", "/d") or String.starts_with?(@current_path || "", "/users/settings") do %>
                <li><a href="/d" class="text-lg">Overview</a></li>
                <li>
                  <details class="group" open={String.starts_with?(@current_path || "", "/d/food-database") or String.starts_with?(@current_path || "", "/d/recipe-database")}>
                    <summary class="text-lg cursor-pointer">
                      Database
                    </summary>
                    <ul class="pl-4 space-y-1">
                      <li><a href="/d/food-database" class="text-lg">Food Database</a></li>
                      <li><a href="/d/recipe-database" class="text-lg">Recipe Database</a></li>
                    </ul>
                  </details>
                </li>
                <li><a href="/d/food" class="text-lg">Food Tracking</a></li>
                <li><a href="/d/progress" class="text-lg">Progress</a></li>
                <li><a href="/d/groceries" class="text-lg">Groceries</a></li>
                <li><a href="/d/favorites" class="text-lg">Favorites</a></li>
              <% end %>
              <%= if @current_scope && @current_scope.user do %>
                <li class="menu-title mt-4">
                  <span>Account</span>
                </li>
                <li><a href="/users/settings" class="text-lg">Settings</a></li>
                <li><.link href={~p"/users/log-out"} method="delete" class="text-lg">Log out</.link></li>
              <% end %>
              <li class="menu-title mt-8">
                <span>Theme</span>
              </li>
              <li>
                <div class="p-2">
                  <.theme_toggle />
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <nav class="navbar bg-base-200/50 backdrop-blur-sm border-b border-base-200 hidden lg:flex">
        <div class="navbar-start">
          <%= if String.starts_with?(@current_path || "", "/d") or
                  (String.starts_with?(@current_path || "", "/users") and
                    not String.starts_with?(@current_path || "", "/users/log-in") and
                    not String.starts_with?(@current_path || "", "/users/register")) do %>
            <a href="/d" class="text-xl font-bold text-primary ml-2">NoBullFit</a>
          <% end %>
        </div>

        <div class="navbar-center">
          <%= unless String.starts_with?(@current_path || "", "/d") or
                  (String.starts_with?(@current_path || "", "/users") and
                    not String.starts_with?(@current_path || "", "/users/log-in") and
                    not String.starts_with?(@current_path || "", "/users/register")) or
                  is_nobullfit_app?(@user_agent) do %>
            <ul class="menu menu-horizontal gap-2">
              <li><a href="/" class="btn btn-ghost btn-sm">Home</a></li>
              <li><a href="/guides" class="btn btn-ghost btn-sm">Guides</a></li>
              <li><a href="/about" class="btn btn-ghost btn-sm">About</a></li>
            </ul>
          <% end %>
        </div>

        <div class="navbar-end">
          <.theme_toggle />
          <div class="ml-4">
            <%= if @current_scope && @current_scope.user do %>
              <div class="flex gap-2">
                <%= if String.starts_with?(@current_path || "", "/d") do %>
                  <.link href={~p"/users/settings"} class="btn btn-ghost btn-sm">Settings</.link>
                <% else %>
                  <a href="/d" class="btn btn-ghost btn-sm">Dashboard</a>
                <% end %>
                <.link href={~p"/users/log-out"} method="delete" class="btn btn-ghost btn-sm">Log out</.link>
              </div>
            <% else %>
              <div class="flex gap-2">
                <a href="/users/log-in" class="btn btn-ghost btn-sm">Log in</a>
                <a href="/users/register" class="btn btn-ghost btn-sm">Register</a>
              </div>
            <% end %>
          </div>
        </div>
      </nav>

      <.maintenance_banner maintenance_status={@maintenance_status} />
    </div>
    """
  end

  @doc """
  Renders a footer component with links and copyright information.
  """
  def footer(assigns) do
    ~H"""
    <%= if String.starts_with?(@current_path || "", "/d") or String.starts_with?(@current_path || "", "/users/settings") do %>
      <!-- Compact footer for dashboard pages -->
      <footer class="bg-base-200/50 border-t border-base-200 mt-auto">
        <div class="container mx-auto px-4 py-4">
          <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p class="text-sm text-base-content/60">
              © <%= DateTime.utc_now().year %> NoBullFit. All rights reserved.
            </p>
            <div class="flex gap-6 text-sm">
              <a href="/privacy" class="text-base-content/70 hover:text-base-content transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" class="text-base-content/70 hover:text-base-content transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    <% else %>
      <!-- Full footer for other pages -->
      <footer class="bg-base-200/50 border-t border-base-200 mt-auto">
        <div class="container mx-auto px-4 py-8">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Brand Section -->
            <div class="space-y-4">
              <h3 class="text-lg font-semibold">NoBullFit</h3>
              <p class="text-sm text-base-content/70">
                Free food tracking and progress monitoring with privacy first.
              </p>
            </div>

            <!-- Contact & Legal -->
            <div class="space-y-4">
              <h3 class="text-lg font-semibold">Legal</h3>
              <ul class="space-y-2">
                <li>
                  <a href="/privacy" class="text-sm text-base-content/70 hover:text-base-content transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms" class="text-sm text-base-content/70 hover:text-base-content transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <!-- Copyright -->
          <div class="mt-8 pt-8 text-center">
            <p class="text-sm text-base-content/60">
              © <%= DateTime.utc_now().year %> NoBullFit. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    <% end %>
    """
  end
end
