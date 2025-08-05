defmodule NobullfitWeb.TermsLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]

  on_mount {NobullfitWeb.UserAuth, :mount_current_scope}

  @impl true
  def mount(_params, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})
    {:ok, assign(socket, page_title: "Terms of Service", current_path: "/terms", maintenance_status: maintenance_status)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-base-100 flex flex-col">
      <.navigation current_scope={@current_scope} current_path={@current_path} maintenance_status={@maintenance_status} />

      <main class="container mx-auto px-4 py-8 md:py-24 flex-1">
        <div class="max-w-4xl mx-auto space-y-12">
          <div class="text-center space-y-6">
            <h1 class="text-4xl font-bold">Terms of Service</h1>
            <p class="text-lg text-base-content/60">
              <strong>Effective Date: 2025-08-05</strong>
            </p>
          </div>

          <div class="space-y-8">
            <div class="space-y-4">
              <p class="text-base-content/70 leading-relaxed">
                Welcome to <strong>NoBullFit</strong>. By using our services, you agree to these Terms of Service. NoBullFit is a privacy-first platform dedicated to helping users track food, monitor progress, and achieve their health goals while respecting their data.
              </p>
            </div>

            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">Development Status</h2>
              <p class="text-base-content/70 leading-relaxed">
                NoBullFit is currently in early development but is now publicly accessible. These Terms of Service ensure that all users clearly understand their rights and responsibilities while using the platform.
              </p>
            </div>

            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">Service Overview</h2>
              <p class="text-base-content/70 leading-relaxed">
                NoBullFit provides free tools for food tracking and progress monitoring with a strong focus on data privacy. Core features are available at no cost, and optional premium features may be introduced in the future. However, essential functionality will always remain accessible without charge.
              </p>
            </div>

            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">What These Terms Cover</h2>
              <div class="grid gap-6">
                <div class="space-y-2">
                  <h3 class="text-xl font-medium">Acceptance of Terms</h3>
                  <p class="text-base-content/70 leading-relaxed">
                    By accessing or using NoBullFit, you agree to be bound by these Terms of Service. If you do not agree, you may not use our services.
                  </p>
                </div>
                <div class="space-y-2">
                  <h3 class="text-xl font-medium">Service Description</h3>
                  <p class="text-base-content/70 leading-relaxed">
                    NoBullFit provides tools for health and wellness tracking, including food logs, activity monitoring, and progress insights. These features are designed to support healthier habits while protecting your privacy.
                  </p>
                </div>
                <div class="space-y-2">
                  <h3 class="text-xl font-medium">User Responsibilities</h3>
                  <p class="text-base-content/70 leading-relaxed">
                    You agree to use NoBullFit for lawful, personal, and non-commercial purposes. Misuse of the service, including attempts to access unauthorized areas or impersonate others, may result in account suspension or termination.
                  </p>
                </div>
                <div class="space-y-2">
                  <h3 class="text-xl font-medium">Privacy and Data</h3>
                  <p class="text-base-content/70 leading-relaxed">
                    NoBullFit is a privacy-first platform. We collect only the data needed to provide our services and will <strong>never</strong> sell your personal information. Please refer to our <a href="/privacy" class="link link-primary">Privacy Policy</a> for full details.
                  </p>
                </div>
                <div class="space-y-2">
                  <h3 class="text-xl font-medium">Limitations of Liability</h3>
                  <p class="text-base-content/70 leading-relaxed">
                    NoBullFit is provided "as is." While we strive to offer a reliable and accurate service, we are not liable for any issues such as data loss, service disruptions, or indirect damages arising from the use of the platform.
                  </p>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">Free Service Commitment</h2>
              <p class="text-base-content/70 leading-relaxed">
                We are committed to offering our core food tracking and progress monitoring features free of charge. If premium features are introduced in the future, the core experience will always remain free and accessible to all users.
              </p>
            </div>

            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">Contact Information</h2>
              <p class="text-base-content/70 leading-relaxed">
                For questions about these terms or the application itself, please contact us at:<br>
                <strong>support@nobull.fit</strong>
              </p>
            </div>

            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">Updates to These Terms</h2>
              <p class="text-base-content/70 leading-relaxed">
                These Terms of Service may be updated as NoBullFit evolves. If significant changes are made, we will notify users clearly on our platform.
              </p>
            </div>
          </div>
        </div>
      </main>

      <.footer current_path={@current_path} />
    </div>
    """
  end
end
