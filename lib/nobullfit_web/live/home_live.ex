defmodule NobullfitWeb.HomeLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]

  on_mount {NobullfitWeb.UserAuth, :mount_current_scope}

  @impl true
  def mount(_params, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})
    {:ok, assign(socket, page_title: "Home", current_path: "/", maintenance_status: maintenance_status)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-base-100 flex flex-col">
      <.navigation current_scope={@current_scope} current_path={@current_path} maintenance_status={@maintenance_status} />

      <main class="container mx-auto px-4 py-8 md:py-24 flex-1">
        <div class="max-w-2xl mx-auto text-center space-y-12">
          <div class="space-y-8">
            <h1 class="text-6xl md:text-7xl font-bold">
              <span class="text-primary">NoBullFit</span>
            </h1>
          </div>

          <div class="space-y-6">
            <p class="text-lg text-base-content/70">
              This project is currently under development and not publicly accessible yet.
            </p>
          </div>

          <img src="/assets/images/avocado.png" alt="NoBullFit" class="w-30 h-auto mx-auto parachuting-avocado" />
        </div>
      </main>

      <.footer current_path={@current_path} />
    </div>
    """
  end
end
