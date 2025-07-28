defmodule NobullfitWeb.TermsLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, page_title: "Terms of Service")}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-base-100 flex flex-col">
      <.navigation />

      <main class="container mx-auto px-4 py-8 md:py-24 flex-1">
        <div class="max-w-4xl mx-auto space-y-12">
          <div class="text-center space-y-6">
            <h1 class="text-4xl font-bold">Terms of Service</h1>
            <div class="badge badge-warning badge-lg">
              Under Development
            </div>
            <p class="text-lg text-base-content/60">
              These terms of service are currently under development as NoBullFit is still in development.
            </p>
          </div>

          <div class="space-y-8">
            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">Development Status</h2>
              <p class="text-base-content/70 leading-relaxed">
                NoBullFit is currently under active development and is not yet publicly accessible. These terms of service will be finalized before the application is launched to ensure clear understanding of the service agreement.
              </p>
            </div>

            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">Service Overview</h2>
              <p class="text-base-content/70 leading-relaxed">
                When NoBullFit launches, it will provide free food tracking and progress monitoring services with a focus on data privacy. The core features will be available at no cost, with potential premium features available through paid plans.
              </p>
            </div>

            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">What These Terms Will Cover</h2>
              <div class="grid gap-4">
                <div class="flex items-start space-x-3">
                  <div class="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <span class="font-medium">Acceptance of Terms</span>
                    <p class="text-sm text-base-content/60 mt-1">Agreement to use the service</p>
                  </div>
                </div>
                <div class="flex items-start space-x-3">
                  <div class="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <span class="font-medium">Service Description</span>
                    <p class="text-sm text-base-content/60 mt-1">What NoBullFit provides</p>
                  </div>
                </div>
                <div class="flex items-start space-x-3">
                  <div class="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <span class="font-medium">User Responsibilities</span>
                    <p class="text-sm text-base-content/60 mt-1">How users should use the service</p>
                  </div>
                </div>
                <div class="flex items-start space-x-3">
                  <div class="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <span class="font-medium">Privacy and Data</span>
                    <p class="text-sm text-base-content/60 mt-1">How we handle your data</p>
                  </div>
                </div>
                <div class="flex items-start space-x-3">
                  <div class="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <span class="font-medium">Limitations of Liability</span>
                    <p class="text-sm text-base-content/60 mt-1">Service limitations and disclaimers</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">Free Service Commitment</h2>
              <p class="text-base-content/70 leading-relaxed">
                NoBullFit is committed to providing core food tracking and progress monitoring features free of charge. While we may introduce premium features in the future, the essential functionality will always remain accessible without cost.
              </p>
            </div>

            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">Contact Information</h2>
              <p class="text-base-content/70 leading-relaxed">
                Once NoBullFit is launched, you will be able to contact us regarding any questions about these terms of service or the application itself.
              </p>
            </div>

            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">Updates to These Terms</h2>
              <p class="text-base-content/70 leading-relaxed">
                These terms of service will be updated as NoBullFit development progresses and before the final launch. We will notify users of any significant changes to these terms.
              </p>
            </div>
          </div>
        </div>
      </main>

      <.footer />
    </div>
    """
  end
end
