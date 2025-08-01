defmodule NobullfitWeb.Dashboard.ProgressLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.CoreComponents
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]
  import NobullfitWeb.Components.Sidebar, only: [sidebar: 1]
  import NobullfitWeb.Layouts, only: [flash_group: 1]

  on_mount {NobullfitWeb.UserAuth, :require_authenticated}

  @impl true
  def mount(_params, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})
    {:ok, assign(socket, page_title: "Activity Log", current_path: "/d/progress", maintenance_status: maintenance_status)}
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
                 <.header>
                   Activity Log
                   <:subtitle>Track your daily exercises and workouts</:subtitle>
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
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="stat bg-base-200 rounded-lg">
                  <div class="stat-title">Calories Burned</div>
                  <div class="stat-value text-primary">420</div>
                  <div class="stat-desc">Goal: 500</div>
                </div>
                <div class="stat bg-base-200 rounded-lg">
                  <div class="stat-title">Workout Time</div>
                  <div class="stat-value text-secondary">45 min</div>
                  <div class="stat-desc">Goal: 60 min</div>
                </div>
                <div class="stat bg-base-200 rounded-lg">
                  <div class="stat-title">Exercises</div>
                  <div class="stat-value text-accent">6</div>
                  <div class="stat-desc">Completed today</div>
                </div>
                <div class="stat bg-base-200 rounded-lg">
                  <div class="stat-title">Active Days</div>
                  <div class="stat-value text-info">5/7</div>
                  <div class="stat-desc">This week</div>
                </div>
              </div>

                                                          <!-- Add Activity and Weight Tracking -->
               <div class="space-y-4 mt-8">
                 <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   <!-- Add Activity -->
                   <div class="space-y-4">
                     <.header size="md">
                       Add Activity
                       <:subtitle>Log your exercises and workouts</:subtitle>
                     </.header>

                     <div class="card bg-base-200 shadow-sm">
                       <div class="card-body">
                         <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <fieldset class="fieldset">
                             <legend class="fieldset-legend">Exercise Type</legend>
                             <select class="select select-bordered w-full">
                               <option>Cardio</option>
                               <option>Strength Training</option>
                               <option>Yoga</option>
                               <option>Running</option>
                               <option>Cycling</option>
                               <option>Swimming</option>
                             </select>
                           </fieldset>
                           <fieldset class="fieldset">
                             <legend class="fieldset-legend">Duration (min)</legend>
                             <input type="number" class="input input-bordered" placeholder="30" />
                           </fieldset>
                           <fieldset class="fieldset">
                             <legend class="fieldset-legend">Calories Burned</legend>
                             <input type="number" class="input input-bordered" placeholder="150" />
                           </fieldset>
                           <fieldset class="fieldset">
                             <legend class="fieldset-legend">&nbsp;</legend>
                             <button class="btn btn-primary">Add Activity</button>
                           </fieldset>
                         </div>
                       </div>
                     </div>
                   </div>

                   <!-- Weight Tracking -->
                   <div class="space-y-4">
                     <.header size="md">
                       Weight Tracking
                       <:subtitle>Log your daily weight measurements</:subtitle>
                     </.header>

                     <div class="card bg-base-200 shadow-sm">
                       <div class="card-body">
                         <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <fieldset class="fieldset">
                             <legend class="fieldset-legend">Weight</legend>
                             <input type="number" class="input input-bordered" placeholder="75.2" step="0.1" />
                           </fieldset>
                           <fieldset class="fieldset">
                             <legend class="fieldset-legend">Unit</legend>
                             <select class="select select-bordered w-full">
                               <option>kg</option>
                               <option>lbs</option>
                             </select>
                           </fieldset>
                           <fieldset class="fieldset">
                             <legend class="fieldset-legend">&nbsp;</legend>
                             <button class="btn btn-primary">Log Weight</button>
                           </fieldset>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>

              <!-- Today's Activities -->
              <div class="space-y-4 mt-8">
                <.header size="md">
                  Today's Activities
                  <:subtitle>Your logged exercises and workouts</:subtitle>
                </.header>

                                 <div class="space-y-3">
                    <!-- Morning Cardio -->
                    <div class="card bg-base-200 shadow-sm">
                      <div class="card-body">
                        <!-- Desktop Layout -->
                        <div class="hidden md:flex justify-between items-start">
                          <div class="flex-1">
                            <div class="flex items-center gap-3">
                              <div class="text-2xl">🏃‍♂️</div>
                              <div>
                                <h3 class="font-semibold">Morning Cardio</h3>
                                <div class="text-sm text-base-content/70">Running • 30 minutes</div>
                              </div>
                            </div>
                          </div>
                          <div class="flex items-center gap-3">
                            <div class="text-right">
                              <div class="text-lg font-semibold text-primary">180 cal</div>
                              <div class="text-sm text-base-content/70">8:00 AM</div>
                            </div>
                            <button class="btn btn-sm btn-ghost text-error hover:text-error">
                              <.icon name="hero-trash" class="size-4" />
                            </button>
                          </div>
                        </div>
                                                 <!-- Mobile Layout -->
                         <div class="md:hidden space-y-3">
                           <div class="flex items-center justify-between">
                             <div class="flex items-center gap-3">
                               <div class="text-xl">🏃‍♂️</div>
                               <h3 class="font-semibold">Morning Cardio</h3>
                             </div>
                             <button class="btn btn-sm btn-ghost text-error hover:text-error">
                               <.icon name="hero-trash" class="size-4" />
                             </button>
                           </div>
                           <div class="space-y-1">
                             <div class="text-sm text-base-content/70">Running • 30 minutes</div>
                           </div>
                           <div class="flex justify-between items-center">
                             <div class="text-sm font-semibold text-primary">180 cal</div>
                             <div class="text-xs text-base-content/70">8:00 AM</div>
                           </div>
                         </div>
                      </div>
                    </div>

                    <!-- Strength Training -->
                    <div class="card bg-base-200 shadow-sm">
                      <div class="card-body">
                        <!-- Desktop Layout -->
                        <div class="hidden md:flex justify-between items-start">
                          <div class="flex-1">
                            <div class="flex items-center gap-3">
                              <div class="text-2xl">💪</div>
                              <div>
                                <h3 class="font-semibold">Upper Body Workout</h3>
                                <div class="text-sm text-base-content/70">Strength Training • 45 minutes</div>
                                <div class="text-xs text-base-content/60 mt-1">Bench Press, Pull-ups, Shoulder Press</div>
                              </div>
                            </div>
                          </div>
                          <div class="flex items-center gap-3">
                            <div class="text-right">
                              <div class="text-lg font-semibold text-secondary">240 cal</div>
                              <div class="text-sm text-base-content/70">2:30 PM</div>
                            </div>
                            <button class="btn btn-sm btn-ghost text-error hover:text-error">
                              <.icon name="hero-trash" class="size-4" />
                            </button>
                          </div>
                        </div>
                        <!-- Mobile Layout -->
                        <div class="md:hidden space-y-3">
                          <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                              <div class="text-xl">💪</div>
                              <h3 class="font-semibold">Upper Body Workout</h3>
                            </div>
                            <button class="btn btn-sm btn-ghost text-error hover:text-error">
                              <.icon name="hero-trash" class="size-4" />
                            </button>
                          </div>
                          <div class="space-y-1">
                            <div class="text-sm text-base-content/70">Strength Training • 45 minutes</div>
                            <div class="text-xs text-base-content/60">Bench Press, Pull-ups, Shoulder Press</div>
                          </div>
                          <div class="flex justify-between items-center">
                            <div class="text-sm font-semibold text-secondary">240 cal</div>
                            <div class="text-xs text-base-content/70">2:30 PM</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Yoga Session -->
                    <div class="card bg-base-200 shadow-sm">
                      <div class="card-body">
                        <!-- Desktop Layout -->
                        <div class="hidden md:flex justify-between items-start">
                          <div class="flex-1">
                            <div class="flex items-center gap-3">
                              <div class="text-2xl">🧘‍♀️</div>
                              <div>
                                <h3 class="font-semibold">Evening Yoga</h3>
                                <div class="text-sm text-base-content/70">Yoga • 20 minutes</div>
                                <div class="text-xs text-base-content/60 mt-1">Sun Salutation, Meditation</div>
                              </div>
                            </div>
                          </div>
                          <div class="flex items-center gap-3">
                            <div class="text-right">
                              <div class="text-lg font-semibold text-accent">80 cal</div>
                              <div class="text-sm text-base-content/70">7:00 PM</div>
                            </div>
                            <button class="btn btn-sm btn-ghost text-error hover:text-error">
                              <.icon name="hero-trash" class="size-4" />
                            </button>
                          </div>
                        </div>
                        <!-- Mobile Layout -->
                        <div class="md:hidden space-y-3">
                          <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                              <div class="text-xl">🧘‍♀️</div>
                              <h3 class="font-semibold">Evening Yoga</h3>
                            </div>
                            <button class="btn btn-sm btn-ghost text-error hover:text-error">
                              <.icon name="hero-trash" class="size-4" />
                            </button>
                          </div>
                          <div class="space-y-1">
                            <div class="text-sm text-base-content/70">Yoga • 20 minutes</div>
                            <div class="text-xs text-base-content/60">Sun Salutation, Meditation</div>
                          </div>
                          <div class="flex justify-between items-center">
                            <div class="text-sm font-semibold text-accent">80 cal</div>
                            <div class="text-xs text-base-content/70">7:00 PM</div>
                          </div>
                        </div>
                      </div>
                    </div>
                 </div>
              </div>

              <!-- Weekly Overview -->
              <div class="space-y-4 mt-8">
                <.header size="md">
                  Weekly Overview
                  <:subtitle>Your activity summary for the week</:subtitle>
                </.header>

                                 <div class="card bg-base-200 shadow-sm">
                   <div class="card-body">
                     <!-- Desktop Layout -->
                     <div class="hidden md:grid grid-cols-7 gap-2">
                       <div class="text-center p-3 bg-base-100 rounded-lg">
                         <div class="text-sm font-medium">Mon</div>
                         <div class="text-lg text-success">✓</div>
                         <div class="text-xs text-base-content/70">45 min</div>
                       </div>
                       <div class="text-center p-3 bg-base-100 rounded-lg">
                         <div class="text-sm font-medium">Tue</div>
                         <div class="text-lg text-success">✓</div>
                         <div class="text-xs text-base-content/70">60 min</div>
                       </div>
                       <div class="text-center p-3 bg-base-100 rounded-lg">
                         <div class="text-sm font-medium">Wed</div>
                         <div class="text-lg text-success">✓</div>
                         <div class="text-xs text-base-content/70">30 min</div>
                       </div>
                       <div class="text-center p-3 bg-base-100 rounded-lg">
                         <div class="text-sm font-medium">Thu</div>
                         <div class="text-lg text-success">✓</div>
                         <div class="text-xs text-base-content/70">50 min</div>
                       </div>
                       <div class="text-center p-3 bg-base-100 rounded-lg">
                         <div class="text-sm font-medium">Fri</div>
                         <div class="text-lg text-success">✓</div>
                         <div class="text-xs text-base-content/70">45 min</div>
                       </div>
                       <div class="text-center p-3 bg-base-100 rounded-lg border-2 border-primary">
                         <div class="text-sm font-medium">Sat</div>
                         <div class="text-lg text-primary">●</div>
                         <div class="text-xs text-base-content/70">Today</div>
                       </div>
                       <div class="text-center p-3 bg-base-100 rounded-lg opacity-50">
                         <div class="text-sm font-medium">Sun</div>
                         <div class="text-lg text-base-content/30">-</div>
                         <div class="text-xs text-base-content/70">Rest</div>
                       </div>
                     </div>
                                           <!-- Mobile Layout -->
                      <div class="md:hidden">
                        <div class="grid grid-cols-4 gap-1">
                          <div class="text-center p-2 bg-base-100 rounded-lg">
                            <div class="text-xs font-medium">Mon</div>
                            <div class="text-sm text-success">✓</div>
                            <div class="text-xs text-base-content/70">45</div>
                          </div>
                          <div class="text-center p-2 bg-base-100 rounded-lg">
                            <div class="text-xs font-medium">Tue</div>
                            <div class="text-sm text-success">✓</div>
                            <div class="text-xs text-base-content/70">60</div>
                          </div>
                          <div class="text-center p-2 bg-base-100 rounded-lg">
                            <div class="text-xs font-medium">Wed</div>
                            <div class="text-sm text-success">✓</div>
                            <div class="text-xs text-base-content/70">30</div>
                          </div>
                          <div class="text-center p-2 bg-base-100 rounded-lg">
                            <div class="text-xs font-medium">Thu</div>
                            <div class="text-sm text-success">✓</div>
                            <div class="text-xs text-base-content/70">50</div>
                          </div>
                        </div>
                        <div class="grid grid-cols-3 gap-1 mt-1">
                          <div class="text-center p-2 bg-base-100 rounded-lg">
                            <div class="text-xs font-medium">Fri</div>
                            <div class="text-sm text-success">✓</div>
                            <div class="text-xs text-base-content/70">45</div>
                          </div>
                          <div class="text-center p-2 bg-base-100 rounded-lg border-2 border-primary">
                            <div class="text-xs font-medium">Sat</div>
                            <div class="text-sm text-primary">●</div>
                            <div class="text-xs text-base-content/70">Today</div>
                          </div>
                          <div class="text-center p-2 bg-base-100 rounded-lg opacity-50">
                            <div class="text-xs font-medium">Sun</div>
                            <div class="text-sm text-base-content/30">-</div>
                            <div class="text-xs text-base-content/70">Rest</div>
                          </div>
                        </div>
                      </div>
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
