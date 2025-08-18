defmodule NobullfitWeb.DashboardLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.CoreComponents
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]
  import NobullfitWeb.Components.Sidebar, only: [sidebar: 1]
  import NobullfitWeb.Layouts, only: [flash_group: 1]

  on_mount {NobullfitWeb.UserAuth, :require_authenticated}

  @impl true
  def mount(_params, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})
    {:ok, assign(socket, page_title: "Dashboard", current_path: "/d", maintenance_status: maintenance_status)}
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
                  Dashboard
                  <:subtitle>Welcome back, {@current_scope.user.email}</:subtitle>
                </.header>

                <div class="text-center py-8 text-base-content/70 mt-10">
                  <img src="/assets/images/under-construction.png" alt="NoBullFit" class="w-45 h-auto mx-auto" />
                  <h3 class="text-lg font-semibold mb-2">Under construction</h3>
                  <p class="text-sm">This page is currently under construction. Please check back soon!</p>
                </div>
              </div>
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
