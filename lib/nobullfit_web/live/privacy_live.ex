defmodule NobullfitWeb.PrivacyLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]

  on_mount {NobullfitWeb.UserAuth, :mount_current_scope}

  @impl true
  def mount(_params, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})
    {:ok, assign(socket, page_title: "Privacy Policy", current_path: "/privacy", maintenance_status: maintenance_status)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-base-100 flex flex-col">
      <.navigation current_scope={@current_scope} current_path={@current_path} maintenance_status={@maintenance_status} />

      <main class="container mx-auto px-4 py-8 md:py-24 flex-1">
        <div class="max-w-4xl mx-auto space-y-12">
          <div class="text-center space-y-6">
            <h1 class="text-4xl font-bold">Privacy Policy</h1>
            <p class="text-lg text-base-content/60">
              This privacy policy is currently under development as NoBullFit is still in development.
            </p>
          </div>

          <div class="space-y-8">
            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">Development Status</h2>
              <p class="text-base-content/70 leading-relaxed">
                NoBullFit is currently under active development and is not yet publicly accessible. This privacy policy will be finalized before the application is launched to ensure complete transparency about how we handle your data.
              </p>
            </div>

            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">Our Privacy Commitment</h2>
              <p class="text-base-content/70 leading-relaxed">
                When NoBullFit launches, we will be committed to protecting your privacy above all else. Our core principle is that your data belongs to you, and we will never sell your personal information to third parties.
              </p>
            </div>

            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">What This Policy Will Cover</h2>
              <div class="grid gap-4">
                <div class="flex items-start space-x-3">
                  <div class="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <span class="font-medium">Data Collection</span>
                    <p class="text-sm text-base-content/60 mt-1">What information we collect and why</p>
                  </div>
                </div>
                <div class="flex items-start space-x-3">
                  <div class="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <span class="font-medium">Data Usage</span>
                    <p class="text-sm text-base-content/60 mt-1">How we use your information</p>
                  </div>
                </div>
                <div class="flex items-start space-x-3">
                  <div class="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <span class="font-medium">Data Protection</span>
                    <p class="text-sm text-base-content/60 mt-1">How we secure your data</p>
                  </div>
                </div>
                <div class="flex items-start space-x-3">
                  <div class="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <span class="font-medium">Your Rights</span>
                    <p class="text-sm text-base-content/60 mt-1">Your control over your data</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">Contact Information</h2>
              <p class="text-base-content/70 leading-relaxed">
                Once NoBullFit is launched, you will be able to contact us regarding any privacy concerns or questions about this policy.
              </p>
            </div>

            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">Updates to This Policy</h2>
              <p class="text-base-content/70 leading-relaxed">
                This privacy policy will be updated as NoBullFit development progresses and before the final launch. We will notify users of any significant changes to this policy.
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
