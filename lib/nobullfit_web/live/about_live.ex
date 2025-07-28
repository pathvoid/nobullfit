defmodule NobullfitWeb.AboutLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, page_title: "About")}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-base-100 flex flex-col">
      <.navigation />
      <main class="container mx-auto px-4 py-8 md:py-24 flex-1">
        <div class="max-w-2xl mx-auto space-y-16">
          <div class="text-center space-y-6">
            <h1 class="text-4xl font-bold">About NoBullFit</h1>
            <p class="text-lg text-base-content/60">
              Free food tracking and progress monitoring with privacy first
            </p>
          </div>

          <div class="space-y-4">
            <h2 class="text-2xl font-semibold">Mission</h2>
            <p class="text-base-content/70 leading-relaxed">
              NoBullFit provides a free platform for tracking food intake, nutritional data, and personal fitness progress while prioritizing your data privacy above all else.
            </p>
          </div>

          <div class="space-y-4">
            <h2 class="text-2xl font-semibold">What We Offer</h2>
            <div class="grid gap-4">
              <div class="flex items-start space-x-3">
                <div class="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div>
                  <span class="font-medium">Free Food Tracking</span>
                  <p class="text-sm text-base-content/60 mt-1">Log your meals, track calories, and monitor nutritional intake</p>
                </div>
              </div>
              <div class="flex items-start space-x-3">
                <div class="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div>
                  <span class="font-medium">Progress Monitoring</span>
                  <p class="text-sm text-base-content/60 mt-1">Track your fitness journey with detailed progress analytics</p>
                </div>
              </div>
              <div class="flex items-start space-x-3">
                <div class="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div>
                  <span class="font-medium">Data Privacy First</span>
                  <p class="text-sm text-base-content/60 mt-1">Your personal data stays private and secure</p>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <h2 class="text-2xl font-semibold">Our Approach</h2>
            <p class="text-base-content/70 leading-relaxed">
              We believe that tracking your nutrition and fitness progress shouldn't come at the cost of your privacy. NoBullFit is built from the ground up with data privacy as our core principle.
            </p>
            <p class="text-base-content/70 leading-relaxed">
              The core features are completely free to use. We may offer paid plans in the future for advanced features, but the essential food tracking and progress monitoring will always remain free.
            </p>
          </div>

          <div class="space-y-4">
            <h2 class="text-2xl font-semibold">Privacy Commitment</h2>
            <p class="text-base-content/70 leading-relaxed">
              Your data belongs to you. We don't sell your information to third parties, and we minimize data collection to only what's necessary for the service to function. Your privacy is not a premium feature - it's our foundation.
            </p>
          </div>
        </div>
      </main>

      <.footer />
    </div>
    """
  end
end
