defmodule NobullfitWeb.Dashboard.FoodLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.CoreComponents
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]
  import NobullfitWeb.Components.Sidebar, only: [sidebar: 1]
  import NobullfitWeb.Layouts, only: [flash_group: 1]

  on_mount {NobullfitWeb.UserAuth, :require_authenticated}

  @impl true
  def mount(_params, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})
    {:ok, assign(socket, page_title: "Food Tracking", current_path: "/d/food", maintenance_status: maintenance_status)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-base-100 flex flex-col">
      <.navigation current_scope={@current_scope} current_path={@current_path} maintenance_status={@maintenance_status} />

      <div class="flex flex-1">
        <.sidebar current_path={@current_path} />

        <div class="flex-1">
          <main class="px-4 py-8 md:py-12">
            <div class="px-4 space-y-4">
              <!-- Header Section -->
              <div>
                <.header centered={true} actions_right={true}>
                  Food Tracking
                  <:subtitle>Track your daily nutrition and meals</:subtitle>
                  <:actions>
                    <div class="hidden md:flex items-center gap-2">
                      <input type="date" class="input input-sm input-bordered" value={Date.utc_today() |> Date.to_string()} />
                      <button class="btn btn-sm btn-ghost">Today</button>
                    </div>
                  </:actions>
                </.header>
                <!-- Mobile Date Picker -->
                <div class="md:hidden mt-4">
                  <div class="flex items-center gap-2">
                    <input type="date" class="input input-sm input-bordered" value={Date.utc_today() |> Date.to_string()} />
                    <button class="btn btn-sm btn-ghost">Today</button>
                  </div>
                </div>
              </div>

              <!-- Today's Summary -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="stat bg-base-200 rounded-lg">
                  <div class="stat-title">Calories</div>
                  <div class="stat-value text-primary">0</div>
                </div>
                <div class="stat bg-base-200 rounded-lg">
                  <div class="stat-title">Protein</div>
                  <div class="stat-value text-secondary">0g</div>
                </div>
                <div class="stat bg-base-200 rounded-lg">
                  <div class="stat-title">Carbs</div>
                  <div class="stat-value text-accent">0g</div>
                </div>
              </div>

              <!-- Today's Meals -->
              <div class="space-y-4 mt-8">
                <.header size="md">
                  Today's Meals
                  <:subtitle>Add foods to track your daily nutrition</:subtitle>
                </.header>

                <!-- Breakfast -->
                <div class="card bg-base-200 shadow-sm">
                  <div class="card-body">
                    <div class="flex justify-between items-center">
                      <h3 class="card-title text-base">Breakfast</h3>
                      <button class="btn btn-sm btn-ghost">Add Food</button>
                    </div>
                    <div class="text-sm text-base-content/70">No foods added yet</div>
                  </div>
                </div>

                <!-- Lunch -->
                <div class="card bg-base-200 shadow-sm">
                  <div class="card-body">
                    <div class="flex justify-between items-center">
                      <h3 class="card-title text-base">Lunch</h3>
                      <button class="btn btn-sm btn-ghost">Add Food</button>
                    </div>
                    <div class="space-y-3 mt-4">
                      <div class="flex justify-between items-center p-3 bg-base-100 rounded-lg">
                        <div class="flex-1">
                          <div class="font-medium">Grilled Chicken Breast</div>
                          <div class="text-sm text-base-content/70">165 calories • 31g protein • 0g carbs</div>
                        </div>
                        <button class="btn btn-sm btn-ghost text-error hover:text-error">
                          <.icon name="hero-trash" class="size-4" />
                        </button>
                      </div>
                      <div class="flex justify-between items-center p-3 bg-base-100 rounded-lg">
                        <div class="flex-1">
                          <div class="font-medium">Brown Rice</div>
                          <div class="text-sm text-base-content/70">110 calories • 2g protein • 23g carbs</div>
                        </div>
                        <button class="btn btn-sm btn-ghost text-error hover:text-error">
                          <.icon name="hero-trash" class="size-4" />
                        </button>
                      </div>
                      <div class="flex justify-between items-center p-3 bg-base-100 rounded-lg">
                        <div class="flex-1">
                          <div class="font-medium">Steamed Broccoli</div>
                          <div class="text-sm text-base-content/70">55 calories • 4g protein • 11g carbs</div>
                        </div>
                        <button class="btn btn-sm btn-ghost text-error hover:text-error">
                          <.icon name="hero-trash" class="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Dinner -->
                <div class="card bg-base-200 shadow-sm">
                  <div class="card-body">
                    <div class="flex justify-between items-center">
                      <h3 class="card-title text-base">Dinner</h3>
                      <button class="btn btn-sm btn-ghost">Add Food</button>
                    </div>
                    <div class="text-sm text-base-content/70">No foods added yet</div>
                  </div>
                </div>

                <!-- Snacks -->
                <div class="card bg-base-200 shadow-sm">
                  <div class="card-body">
                    <div class="flex justify-between items-center">
                      <h3 class="card-title text-base">Snacks</h3>
                      <button class="btn btn-sm btn-ghost">Add Food</button>
                    </div>
                    <div class="text-sm text-base-content/70">No foods added yet</div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <.footer current_path={@current_path} />
      <.flash_group flash={@flash} />
    </div>
    """
  end
end
