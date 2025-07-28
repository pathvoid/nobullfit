defmodule NobullfitWeb.Components.Navigation do
  use Phoenix.Component
  import NobullfitWeb.Layouts, only: [theme_toggle: 1]

  def navigation(assigns) do
      ~H"""
      <div>
        <div class="drawer lg:hidden">
          <input id="mobile-drawer" type="checkbox" class="drawer-toggle" />
          <div class="drawer-content">
            <nav class="navbar bg-base-200/50 backdrop-blur-sm border-b border-base-200">
              <div class="navbar-start">
                <label for="mobile-drawer" class="btn btn-ghost btn-sm">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                  </svg>
                </label>
              </div>

              <div class="navbar-center hidden lg:flex">
                <ul class="menu menu-horizontal gap-2">
                  <li><a href="/" class="btn btn-ghost btn-sm">Home</a></li>
                  <li><a href="/about" class="btn btn-ghost btn-sm">About</a></li>
                </ul>
              </div>

              <div class="navbar-end">
                <div class="hidden lg:block">
                  <.theme_toggle />
                </div>
              </div>
            </nav>
          </div>

          <div class="drawer-side" style="z-index: 99999;">
            <label for="mobile-drawer" aria-label="close sidebar" class="drawer-overlay" style="z-index: 99998;"></label>
            <ul class="menu p-4 w-80 min-h-full bg-base-200 text-base-content" style="z-index: 99999;">
              <li class="menu-title">
                <span>Navigation</span>
              </li>
              <li><a href="/" class="text-lg">Home</a></li>
              <li><a href="/about" class="text-lg">About</a></li>
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

        <nav class="navbar bg-base-200/50 backdrop-blur-sm border-b border-base-200 hidden lg:flex">
          <div class="navbar-start">
          </div>

          <div class="navbar-center">
            <ul class="menu menu-horizontal gap-2">
              <li><a href="/" class="btn btn-ghost btn-sm">Home</a></li>
              <li><a href="/about" class="btn btn-ghost btn-sm">About</a></li>
            </ul>
          </div>

          <div class="navbar-end">
            <.theme_toggle />
          </div>
        </nav>
      </div>
      """
  end

  @doc """
  Renders a footer component with links and copyright information.
  """
  def footer(assigns) do
    ~H"""
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
    """
  end
end
