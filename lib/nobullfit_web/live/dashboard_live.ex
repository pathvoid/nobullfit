defmodule NobullfitWeb.DashboardLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.CoreComponents
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]
  import NobullfitWeb.Layouts, only: [flash_group: 1]

  on_mount {NobullfitWeb.UserAuth, :require_authenticated}

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, page_title: "Dashboard", current_path: "/d")}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-base-100 flex flex-col">
      <.navigation current_scope={@current_scope} current_path={@current_path} />

      <main class="container mx-auto px-4 py-8 md:py-24 flex-1">
        <div class="max-w-4xl mx-auto space-y-8">
          <div class="text-center">
            <.header>
              Dashboard
              <:subtitle>Welcome back, {@current_scope.user.email}</:subtitle>
            </.header>
          </div>
        </div>
      </main>

      <.footer />
      <.flash_group flash={@flash} />
    </div>
    """
  end
end
