defmodule NobullfitWeb.GuidesLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]
  import NobullfitWeb.Layouts, only: [flash_group: 1]

  on_mount {NobullfitWeb.UserAuth, :mount_current_scope}

  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-base-100 flex flex-col">
      <.navigation current_scope={@current_scope} current_path={@current_path} maintenance_status={@maintenance_status} />

      <main class="container mx-auto px-4 py-8 md:py-24 flex-1">
        <div class="max-w-3xl mx-auto space-y-12">
          <div class="text-center space-y-8">
            <h1 class="text-4xl font-bold">Guide to Getting Fit</h1>
            <p class="text-lg text-base-content/60">
              Staying healthy and losing weight doesn't have to be complicated. You don't need a perfect plan, expensive supplements, or a 90-day challenge to get started. You just need to take that first step — and keep stepping.
            </p>
            <p class="text-base-content/70">
              This guide is here to help you do exactly that.
            </p>
          </div>

          <img src="https://cdn.nobull.fit/professor-pear.png" alt="NoBullFit" class="w-50 h-auto mx-auto" />

          <div class="space-y-24">
            <div class="space-y-6">
              <h2 class="text-2xl font-semibold">Start Simple, Stay Consistent</h2>
              <div class="space-y-6">
                <p class="text-base-content/70 leading-relaxed">
                  If you're waiting for motivation to magically appear, don't. Progress doesn't start with motivation — it starts with action. Walking for ten minutes is better than planning a one-hour workout you'll never do. Pick something manageable and do it consistently. That's how habits are built.
                </p>
                <p class="text-base-content/70 leading-relaxed">
                  Don't try to change everything at once. Choose one small win — whether it's a daily walk, drinking more water, or cutting out that second soda — and make it stick.
                </p>
              </div>
            </div>

            <div class="space-y-6">
              <h2 class="text-2xl font-semibold">What You Eat Matters (But It Doesn't Have to Be Miserable)</h2>
              <div class="space-y-6">
                <p class="text-base-content/70 leading-relaxed">
                  You don't need a new diet. You need better choices, most of the time. Eat real food. Prioritize protein. Add more vegetables. Drink more water. Cut back on ultra-processed junk, not because it's evil, but because it makes it easier to overeat.
                </p>
                <p class="text-base-content/70 leading-relaxed">
                  Forget perfect. Focus on <em>better</em>. Every meal is a chance to get it right — or at least, get it <em>less wrong</em>.
                </p>
              </div>
            </div>

            <div class="space-y-6">
              <h2 class="text-2xl font-semibold">Movement Isn't Just the Gym</h2>
              <div class="space-y-6">
                <p class="text-base-content/70 leading-relaxed">
                  You don't have to be a gym rat. Walking, stretching, dancing, taking the stairs — it all adds up. Strength training helps preserve muscle (especially while losing fat), but if that's not your thing yet, start with what is.
                </p>
                <p class="text-base-content/70 leading-relaxed">
                  If you're moving more today than you did yesterday, you're already winning.
                </p>
              </div>
            </div>

            <div class="space-y-6">
              <h2 class="text-2xl font-semibold">Rest Is Part of the Process</h2>
              <div class="space-y-6">
                <p class="text-base-content/70 leading-relaxed">
                  Sleep isn't optional. Neither is rest. Most people burn out trying to go too hard, too fast. Let your body recover. Aim for 7–9 hours of sleep. Take rest days seriously. Progress happens when you recover, not when you grind non-stop.
                </p>
                <p class="text-base-content/70 leading-relaxed">
                  And if you're stressed? That's part of your health too. Mental burnout can sabotage physical progress. Don't ignore it.
                </p>
              </div>
            </div>

            <div class="space-y-6">
              <h2 class="text-2xl font-semibold">Fat Loss? It's All About the Deficit</h2>
              <div class="space-y-6">
                <p class="text-base-content/70 leading-relaxed">
                  There's no secret. If you burn more than you eat, you lose fat. The trick is doing it in a way that doesn't make you miserable. Eat enough to stay sane. Move enough to make a difference. Track progress by weeks, not days.
                </p>
                <p class="text-base-content/70 leading-relaxed">
                  And no — you can't "target belly fat." Your body decides where it comes off. Be patient.
                </p>
              </div>
            </div>

            <div class="space-y-6">
              <h2 class="text-2xl font-semibold">Forget Perfection. Aim for Progress.</h2>
              <div class="space-y-6">
                <p class="text-base-content/70 leading-relaxed">
                  You will mess up. Everyone does. The difference between people who get results and those who don't? The ones who succeed get back on track.
                </p>
                <p class="text-base-content/70 leading-relaxed">
                  Perfection is a myth. Progress is the goal.
                </p>
              </div>
            </div>

            <div class="bg-base-200 p-6 rounded-lg border-l-4 border-primary">
              <p class="text-lg font-medium text-base-content/80">
                This is the NoBull way: start small, stay consistent, and don't fall for fads. You don't need more willpower — just a better strategy.
              </p>
            </div>
          </div>
        </div>
      </main>

      <.footer current_path={@current_path} />
      <.flash_group flash={@flash} />
    </div>
    """
  end

  def mount(_params, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})

    {:ok, assign(socket, current_path: "/guides", maintenance_status: maintenance_status)}
  end
end
