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
              <strong>Effective Date: 2025-08-05</strong>
            </p>
          </div>

          <div class="space-y-8">
            <div class="space-y-4">
              <p class="text-base-content/70 leading-relaxed">
                At <strong>NoBullFit</strong>, your privacy is our top priority. As a <em>privacy-first</em> platform, we believe your data belongs to you — and we will <strong>never</strong> sell it. Ever.
              </p>
            </div>

            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">Development Status</h2>
              <p class="text-base-content/70 leading-relaxed">
                NoBullFit is nearing its public launch. This privacy policy is now in place to ensure full transparency about how we handle your data from day one.
              </p>
            </div>

            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">Our Privacy Commitment</h2>
              <p class="text-base-content/70 leading-relaxed">
                When you use NoBullFit, you can trust that:
              </p>
              <div class="grid gap-3">
                <div class="flex items-start space-x-3">
                  <div class="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p class="text-base-content/70">Your personal data belongs to you.</p>
                </div>
                <div class="flex items-start space-x-3">
                  <div class="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p class="text-base-content/70">We <strong>do not</strong> and <strong>will not</strong> sell your data to third parties.</p>
                </div>
                <div class="flex items-start space-x-3">
                  <div class="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p class="text-base-content/70">We only collect what's necessary to provide and improve your experience.</p>
                </div>
                <div class="flex items-start space-x-3">
                  <div class="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p class="text-base-content/70">You have full control over your data.</p>
                </div>
              </div>
              <p class="text-base-content/70 leading-relaxed mt-4">
                We are committed to applying best-in-class security practices and protecting your privacy at every step.
              </p>
            </div>

            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">What This Policy Covers</h2>
              <div class="grid gap-6">
                <div class="space-y-2">
                  <h3 class="text-xl font-medium">Data Collection</h3>
                  <p class="text-base-content/70 leading-relaxed">
                    We only collect essential information such as your email address, username, progress tracking data (e.g., weight, sleep, activity), and preferences. We'll always be transparent about why we need it.
                  </p>
                </div>
                <div class="space-y-2">
                  <h3 class="text-xl font-medium">Data Usage</h3>
                  <p class="text-base-content/70 leading-relaxed">
                    Your data is used strictly to provide you with personalized insights, track your progress, and improve the NoBullFit experience. We never use your data for targeted advertising.
                  </p>
                </div>
                <div class="space-y-2">
                  <h3 class="text-xl font-medium">Data Protection</h3>
                  <p class="text-base-content/70 leading-relaxed">
                    We implement robust technical and organizational measures to protect your data from unauthorized access, misuse, or loss.
                  </p>
                </div>
                <div class="space-y-2">
                  <h3 class="text-xl font-medium">Your Rights</h3>
                  <p class="text-base-content/70 leading-relaxed">
                    You have the right to access, correct, or delete your personal data at any time. You can also request the deletion or deactivation of your account with no questions asked.
                  </p>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">Contact Information</h2>
              <p class="text-base-content/70 leading-relaxed">
                Once NoBullFit is live, you'll be able to reach us at:<br>
                <strong>support@nobull.fit</strong><br>
                (for any privacy-related questions or concerns)
              </p>
            </div>

            <div class="space-y-4">
              <h2 class="text-2xl font-semibold">Updates to This Policy</h2>
              <p class="text-base-content/70 leading-relaxed">
                We may update this privacy policy as NoBullFit evolves or to comply with legal requirements. If significant changes are made, we'll notify users clearly on our site.
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
