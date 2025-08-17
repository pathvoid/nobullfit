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
        <div class="max-w-4xl mx-auto space-y-12">
          <div class="text-center space-y-8">
            <h1 class="text-6xl md:text-7xl font-bold">
              <span class="text-primary">NoBullFit</span>
            </h1>
            <p class="text-xl text-base-content/70 leading-relaxed">
              <strong>NoBullFit</strong> is a comprehensive privacy-first platform designed to help you track your nutrition, discover recipes, manage grocery lists, and monitor your health progress — all without compromising your data.
            </p>
            <p class="text-lg text-base-content/70">
              This project is currently in <strong>early development</strong>, but it's already publicly available. You're welcome to explore and use the features, all completely free.
            </p>
          </div>

          <img src="/assets/images/avocado.png" alt="NoBullFit" class="w-30 h-auto mx-auto parachuting-avocado" />

          <div class="space-y-24">
            <div class="space-y-12">
              <h2 class="text-3xl font-bold text-center">What You Can Do</h2>
              <div class="grid md:grid-cols-2 gap-12">
                <div class="space-y-6">
                  <h3 class="text-xl font-semibold">Food Database</h3>
                  <p class="text-base-content/70 leading-relaxed">
                    Browse a comprehensive database of foods with detailed nutritional information to make informed dietary choices.
                  </p>
                </div>
                <div class="space-y-6">
                  <h3 class="text-xl font-semibold">Food Tracking</h3>
                  <p class="text-base-content/70 leading-relaxed">
                    Log your daily meals and snacks to track your nutrition intake and maintain a detailed food diary.
                  </p>
                </div>
                <div class="space-y-6">
                  <h3 class="text-xl font-semibold">Recipe Database</h3>
                  <p class="text-base-content/70 leading-relaxed">
                    Discover and save recipes with complete nutritional breakdowns and ingredient lists.
                  </p>
                </div>
                <div class="space-y-6">
                  <h3 class="text-xl font-semibold">Favorites</h3>
                  <p class="text-base-content/70 leading-relaxed">
                    Save your favorite foods and recipes for quick access and easy meal planning.
                  </p>
                </div>
                <div class="space-y-6">
                  <h3 class="text-xl font-semibold">Grocery Lists</h3>
                  <p class="text-base-content/70 leading-relaxed">
                    Create and manage multiple grocery lists. Perfect for meal planning and shopping.
                  </p>
                </div>
                <div class="space-y-6">
                  <h3 class="text-xl font-semibold">Progress Tracking</h3>
                  <p class="text-base-content/70 leading-relaxed">
                    Monitor your health journey with comprehensive tracking:
                  </p>
                  <ul class="list-disc list-inside text-base-content/70 space-y-3 ml-4">
                    <li>Weight tracking and trends</li>
                    <li>Activity logging</li>
                    <li>Daily nutrition tracking</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="space-y-8">
              <h2 class="text-3xl font-bold text-center">Built with Privacy in Mind</h2>
              <p class="text-base-content/70 leading-relaxed text-center max-w-2xl mx-auto">
                Unlike many health apps, we don't collect unnecessary data and we <strong>never</strong> sell your personal information. NoBullFit is and always will be a <em>privacy-first</em> platform.
              </p>
            </div>

            <div class="space-y-8">
              <h2 class="text-3xl font-bold text-center">Early Access Notice</h2>
              <p class="text-base-content/70 leading-relaxed text-center max-w-2xl mx-auto">
                Please note that NoBullFit is still in early development. Some features may be incomplete or subject to change. We're actively improving the platform and welcome your feedback.
              </p>
            </div>

            <div class="text-center space-y-10">
              <h2 class="text-3xl font-bold">Get Started</h2>
              <p class="text-lg text-base-content/70">
                Ready to explore?
              </p>
              <div class="flex justify-center">
                <%= if @current_scope do %>
                  <a href="/dashboard" class="btn btn-primary btn-lg">Dashboard</a>
                <% else %>
                  <a href="/register" class="btn btn-primary btn-lg">Sign up now!</a>
                <% end %>
              </div>
            </div>
          </div>
        </div>
      </main>

      <.footer current_path={@current_path} />
    </div>
    """
  end
end
