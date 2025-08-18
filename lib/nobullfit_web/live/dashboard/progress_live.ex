defmodule NobullfitWeb.Dashboard.ProgressLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.CoreComponents
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]
  import NobullfitWeb.Components.Sidebar, only: [sidebar: 1]
  import NobullfitWeb.Layouts, only: [flash_group: 1]

  alias Nobullfit.Activities
  alias Nobullfit.Activities.Activity
  alias Nobullfit.WeightEntries
  alias Nobullfit.WeightEntries.WeightEntry

  on_mount {NobullfitWeb.UserAuth, :require_authenticated}

  @impl true
  def mount(_params, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})

    # Initialize with UTC defaults - will be updated when timezone data is received from client
    user_timezone = "UTC"
    local_date = nil
    today = Date.utc_today()

    # Load today's activities and summary
    daily_summary = Activities.get_user_daily_summary(socket.assigns.current_scope.user.id, today)
    weekly_summary = Activities.get_user_weekly_summary(socket.assigns.current_scope.user.id, get_week_start(today))

    # Create empty activity changeset for the form
    activity_changeset = Activities.change_activity(%Activity{})

    # Get weight summary for the selected date and preferred unit
    weight_summary = WeightEntries.get_user_weight_summary_for_date(socket.assigns.current_scope.user.id, today)
    preferred_unit = WeightEntries.get_user_preferred_unit(socket.assigns.current_scope.user.id)
    weight_changeset = WeightEntries.change_weight_entry(%WeightEntry{})

    socket =
      assign(socket,
        page_title: "Progress",
        current_path: "/d/progress",
        maintenance_status: maintenance_status,
        selected_date: today,
        user_timezone: user_timezone,
        user_local_date: local_date,
        max_date: (if local_date, do: local_date, else: today |> Date.to_string()),
        daily_summary: daily_summary,
        weekly_summary: weekly_summary,
        activity_changeset: activity_changeset,
        activity_form: to_form(activity_changeset),
        activity_submitted: false,
        weight_summary: weight_summary,
        preferred_unit: preferred_unit,
        weight_changeset: weight_changeset,
        weight_form: to_form(weight_changeset),
        weight_submitted: false
      )

    {:ok, socket}
  end

  @impl true
  def handle_event("save_activity", %{"activity" => activity_params}, socket) do
    # Clean up empty exercise_type and add user_id and current date to the params
    activity_params =
      activity_params
      |> Map.update("exercise_type", nil, fn value -> if value == "", do: nil, else: value end)
      |> Map.merge(%{
        "user_id" => socket.assigns.current_scope.user.id,
        "activity_date" => socket.assigns.selected_date
      })

    case Activities.create_activity(activity_params) do
      {:ok, _activity} ->
        # Reload activities and summary
        daily_summary = Activities.get_user_daily_summary(socket.assigns.current_scope.user.id, socket.assigns.selected_date)
        weekly_summary = Activities.get_user_weekly_summary(socket.assigns.current_scope.user.id, get_week_start(socket.assigns.selected_date))

        # Create new empty changeset for the form and reset it
        activity_changeset = Activities.change_activity(%Activity{})
        activity_form = to_form(activity_changeset)

        socket =
          assign(socket,
            daily_summary: daily_summary,
            weekly_summary: weekly_summary,
            activity_changeset: activity_changeset,
            activity_form: activity_form,
            activity_submitted: false
          )

        {:noreply, socket |> put_flash(:info, "Activity added successfully!") |> push_event("activity-added", %{})}

      {:error, %Ecto.Changeset{} = changeset} ->
        socket =
          assign(socket,
            activity_changeset: changeset,
            activity_form: to_form(changeset, action: :insert),
            activity_submitted: true
          )

        {:noreply, socket}
    end
  end

  def handle_event("delete_activity", %{"id" => id}, socket) do
    activity = Activities.get_user_activity!(socket.assigns.current_scope.user.id, String.to_integer(id))

    case Activities.delete_activity(activity) do
      {:ok, _} ->
        # Reload activities and summary
        daily_summary = Activities.get_user_daily_summary(socket.assigns.current_scope.user.id, socket.assigns.selected_date)
        weekly_summary = Activities.get_user_weekly_summary(socket.assigns.current_scope.user.id, get_week_start(socket.assigns.selected_date))

        socket =
          assign(socket,
            daily_summary: daily_summary,
            weekly_summary: weekly_summary
          )

        {:noreply, put_flash(socket, :info, "Activity deleted successfully!")}

      {:error, _} ->
        {:noreply, put_flash(socket, :error, "Failed to delete activity.")}
    end
  end

  def handle_event("change_date", params, socket) do
    # Prioritize "date" parameter (from Today button) over "value" parameter (from date picker)
    date_str = Map.get(params, "date") || Map.get(params, "value")

    case Date.from_iso8601(date_str) do
      {:ok, date} ->
        # Check if the date is in the future (using local date as reference)
        today =
          case socket.assigns.user_local_date do
            nil -> socket.assigns.selected_date
            local_date_str ->
              case Date.from_iso8601(local_date_str) do
                {:ok, date} -> date
                {:error, _} -> socket.assigns.selected_date
              end
          end

        if Date.compare(date, today) == :gt do
          {:noreply, put_flash(socket, :error, "Cannot select future dates.")}
        else
          # Reload activities and summary for the new date
          daily_summary = Activities.get_user_daily_summary(socket.assigns.current_scope.user.id, date)
          weekly_summary = Activities.get_user_weekly_summary(socket.assigns.current_scope.user.id, get_week_start(date))
          weight_summary = WeightEntries.get_user_weight_summary_for_date(socket.assigns.current_scope.user.id, date)

          socket =
            assign(socket,
              selected_date: date,
              daily_summary: daily_summary,
              weekly_summary: weekly_summary,
              weight_summary: weight_summary
            )

          {:noreply, socket}
        end

      {:error, _} ->
        {:noreply, put_flash(socket, :error, "Invalid date format.")}
    end
  end

  def handle_event("save_weight", %{"weight_entry" => weight_params}, socket) do
    # Add user_id and current date to the params
    weight_params =
      weight_params
      |> Map.merge(%{
        "user_id" => socket.assigns.current_scope.user.id,
        "entry_date" => socket.assigns.selected_date
      })

    case WeightEntries.create_weight_entry(weight_params) do
      {:ok, _weight_entry} ->
        # Reload weight summary for the current date
        weight_summary = WeightEntries.get_user_weight_summary_for_date(socket.assigns.current_scope.user.id, socket.assigns.selected_date)
        preferred_unit = WeightEntries.get_user_preferred_unit(socket.assigns.current_scope.user.id)
        weight_changeset = WeightEntries.change_weight_entry(%WeightEntry{})
        weight_form = to_form(weight_changeset)

        socket =
          assign(socket,
            weight_summary: weight_summary,
            preferred_unit: preferred_unit,
            weight_changeset: weight_changeset,
            weight_form: weight_form,
            weight_submitted: false
          )

        {:noreply, socket |> put_flash(:info, "Weight logged successfully!") |> push_event("weight-added", %{})}

      {:error, %Ecto.Changeset{} = changeset} ->
        socket =
          assign(socket,
            weight_changeset: changeset,
            weight_form: to_form(changeset, action: :insert),
            weight_submitted: true
          )

        {:noreply, socket}
    end
  end

  def handle_event("timezone-data", %{"timezone" => timezone, "localDate" => local_date}, socket) do
    # Update the socket assigns with the timezone data
    socket =
      assign(socket,
        user_timezone: timezone,
        user_local_date: local_date,
        selected_date:
          case Date.from_iso8601(local_date) do
            {:ok, date} -> date
            {:error, _} -> Date.utc_today()
          end,
        max_date: local_date
      )

    # Reload data with the correct date
    daily_summary = Activities.get_user_daily_summary(socket.assigns.current_scope.user.id, socket.assigns.selected_date)
    weekly_summary = Activities.get_user_weekly_summary(socket.assigns.current_scope.user.id, get_week_start(socket.assigns.selected_date))
    weight_summary = WeightEntries.get_user_weight_summary_for_date(socket.assigns.current_scope.user.id, socket.assigns.selected_date)

    socket =
      assign(socket,
        daily_summary: daily_summary,
        weekly_summary: weekly_summary,
        weight_summary: weight_summary
      )

    {:noreply, socket}
  end

  defp get_week_start(date) do
    # Get the start of the week (Monday) for the given date
    day_of_week = Date.day_of_week(date)
    days_to_subtract = day_of_week - 1  # Monday is 1, so subtract (day_of_week - 1)
    Date.add(date, -days_to_subtract)
  end

  defp count_active_days(daily_summaries) do
    daily_summaries
    |> Enum.count(fn summary -> summary.total_duration > 0 end)
  end

  defp format_time(time) do
    Time.to_string(time)
    |> String.slice(0, 5)  # Format as HH:MM
  end

  defp get_day_name(date) do
    case Date.day_of_week(date) do
      1 -> "Mon"
      2 -> "Tue"
      3 -> "Wed"
      4 -> "Thu"
      5 -> "Fri"
      6 -> "Sat"
      7 -> "Sun"
    end
  end

  defp get_week_day_class(date, selected_date) do
    base_class = "text-center p-3 bg-base-100 rounded-lg"
    if Date.compare(date, selected_date) == :eq do
      "#{base_class} border-2 border-primary"
    else
      base_class
    end
  end

  defp get_status_class(total_duration) do
    if total_duration > 0 do
      "text-lg text-success"
    else
      "text-lg text-base-content/30"
    end
  end

  defp get_mobile_week_day_class(date, selected_date) do
    base_class = "text-center p-2 bg-base-100 rounded-lg"
    if Date.compare(date, selected_date) == :eq do
      "#{base_class} border-2 border-primary"
    else
      base_class
    end
  end

  defp get_mobile_status_class(total_duration) do
    if total_duration > 0 do
      "text-sm text-success"
    else
      "text-sm text-base-content/30"
    end
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-base-100 flex flex-col" id="main-container" phx-hook="TimezoneData">
      <.navigation current_scope={@current_scope} current_path={@current_path} maintenance_status={@maintenance_status} />
      <div class="flex flex-1">
        <.sidebar current_path={@current_path} />
        <div class="flex-1">
          <main class="px-4 py-8 md:py-12">
            <div class="px-4 space-y-4">
              <!-- Header Section -->
              <div>
                <.header centered={true} actions_right={true}>
                  Progress
                  <:subtitle>Track your daily progress</:subtitle>
                  <:actions>
                    <div class="hidden md:flex items-center gap-2">
                      <input type="date" class="input input-sm input-bordered" value={@selected_date |> Date.to_string()} max={@max_date} id="desktop-date-picker" phx-hook="DatePicker" />
                      <button class="btn btn-sm btn-primary" phx-click="change_date" phx-value-date={@max_date}>Today</button>
                    </div>
                  </:actions>
                </.header>
                <!-- Mobile Date Picker -->
                <div class="md:hidden mt-4">
                  <div class="flex items-center gap-2 justify-center">
                    <input type="date" class="input input-sm input-bordered" value={@selected_date |> Date.to_string()} max={@max_date} id="mobile-date-picker" phx-hook="DatePicker" />
                    <button class="btn btn-sm btn-primary" phx-click="change_date" phx-value-date={@max_date}>Today</button>
                  </div>
                </div>
              </div>

              <!-- Today's Summary -->
              <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div class="stat bg-base-200 rounded-lg">
                  <div class="stat-title">Calories Burned</div>
                  <div class="stat-value text-primary">{@daily_summary.total_calories}</div>
                  <div class="stat-desc">Goal: 500</div>
                </div>
                <div class="stat bg-base-200 rounded-lg">
                  <div class="stat-title">Workout Time</div>
                  <div class="stat-value text-secondary">{@daily_summary.total_duration} min</div>
                  <div class="stat-desc">Goal: 60 min</div>
                </div>
                <div class="stat bg-base-200 rounded-lg">
                  <div class="stat-title">Exercises</div>
                  <div class="stat-value text-accent">{@daily_summary.activity_count}</div>
                  <div class="stat-desc">Completed today</div>
                </div>
                <div class="stat bg-base-200 rounded-lg">
                  <div class="stat-title">Active Days</div>
                  <div class="stat-value text-info">{count_active_days(@weekly_summary.daily_summaries)}/7</div>
                  <div class="stat-desc">This week</div>
                </div>
                <div class="stat bg-base-200 rounded-lg">
                  <div class="stat-title">Current Weight</div>
                  <%= if @weight_summary.current_weight do %>
                    <div class="stat-value text-warning">{WeightEntry.format_weight(@weight_summary.current_weight, @weight_summary.unit)}</div>
                    <%= if @weight_summary.difference do %>
                      <div class="stat-desc">{WeightEntry.format_difference(@weight_summary.difference, @weight_summary.unit)}</div>
                    <% else %>
                      <div class="stat-desc">First entry</div>
                    <% end %>
                  <% else %>
                    <div class="stat-value text-warning">--</div>
                    <div class="stat-desc">No weight logged</div>
                  <% end %>
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
                        <.form for={@activity_form} phx-submit="save_activity" id="activity-form" phx-hook="ActivityForm" novalidate>
                          <div class="space-y-4">
                            <!-- First row: Exercise Type and Duration -->
                            <div class="flex gap-4">
                              <fieldset class="fieldset flex-1">
                                <legend class="fieldset-legend">Exercise Type</legend>
                                <.input
                                  field={@activity_form[:exercise_type]}
                                  type="select"
                                  class={if @activity_submitted && @activity_changeset.errors[:exercise_type], do: "select select-bordered select-error w-full", else: "select select-bordered w-full"}
                                  prompt="Select exercise type"
                                  options={[
                                    {"Cardio", "Cardio"},
                                    {"Strength Training", "Strength Training"},
                                    {"Yoga", "Yoga"},
                                    {"Running", "Running"},
                                    {"Cycling", "Cycling"},
                                    {"Swimming", "Swimming"}
                                  ]}
                                  no_wrapper={true}
                                />
                              </fieldset>
                              <fieldset class="fieldset flex-1">
                                <legend class="fieldset-legend">Duration (min)</legend>
                                <.input
                                  field={@activity_form[:duration_minutes]}
                                  type="number"
                                  class={if @activity_submitted && @activity_changeset.errors[:duration_minutes], do: "input input-bordered input-error", else: "input input-bordered"}
                                  placeholder="30"
                                  no_wrapper={true}
                                />
                              </fieldset>
                            </div>
                            <!-- Second row: Calories Burned and Add Activity button -->
                            <div class="flex gap-4">
                              <fieldset class="fieldset">
                                <legend class="fieldset-legend">Calories Burned</legend>
                                <.input
                                  field={@activity_form[:calories_burned]}
                                  type="number"
                                  class={if @activity_submitted && @activity_changeset.errors[:calories_burned], do: "input input-bordered input-error", else: "input input-bordered"}
                                  placeholder="150"
                                  no_wrapper={true}
                                />
                              </fieldset>
                              <fieldset class="fieldset">
                                <legend class="fieldset-legend">&nbsp;</legend>
                                <button type="submit" class="btn btn-primary">Add Activity</button>
                              </fieldset>
                            </div>
                          </div>
                        </.form>
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
                        <.form for={@weight_form} phx-submit="save_weight" id="weight-form" phx-hook="WeightForm" novalidate>
                          <div class="flex gap-4">
                            <fieldset class="fieldset">
                              <legend class="fieldset-legend">Weight</legend>
                              <.input
                                field={@weight_form[:weight]}
                                type="number"
                                class={if @weight_submitted && @weight_changeset.errors[:weight], do: "input input-bordered input-error", else: "input input-bordered"}
                                placeholder="75.2"
                                step="0.1"
                                no_wrapper={true}
                              />
                            </fieldset>
                            <fieldset class="fieldset">
                              <legend class="fieldset-legend">Unit</legend>
                              <.input
                                field={@weight_form[:unit]}
                                type="select"
                                class={if @weight_submitted && @weight_changeset.errors[:unit], do: "select select-bordered select-error w-full", else: "select select-bordered w-full"}
                                prompt="Select unit"
                                options={[
                                  {"Kilograms (kg)", "kg"},
                                  {"Pounds (lbs)", "lbs"}
                                ]}
                                value={@preferred_unit}
                                data-preferred-unit={@preferred_unit}
                                no_wrapper={true}
                              />
                            </fieldset>
                            <fieldset class="fieldset">
                              <legend class="fieldset-legend">&nbsp;</legend>
                              <button type="submit" class="btn btn-primary">Log Weight</button>
                            </fieldset>
                          </div>
                        </.form>
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
                  <%= if Enum.empty?(@daily_summary.activities) do %>
                    <div class="text-center py-8 text-base-content/70">
                      <img src="/assets/images/apple.png" alt="NoBullFit" class="w-45 h-auto mx-auto" />
                      <h3 class="text-lg font-semibold mb-2">No activities yet</h3>
                      <p class="text-sm">Add your first activity above to get started!</p>
                    </div>
                  <% else %>
                    <%= for activity <- @daily_summary.activities do %>
                      <div class="card bg-base-200 shadow-sm">
                        <div class="card-body">
                          <!-- Desktop Layout -->
                          <div class="hidden md:flex justify-between items-start">
                            <div class="flex-1">
                              <div class="flex items-center gap-3">
                                <div class="text-2xl"><%= Activity.exercise_type_icon(activity.exercise_type) %></div>
                                <div>
                                  <h3 class="font-semibold"><%= activity.exercise_type %></h3>
                                  <div class="text-sm text-base-content/70"><%= activity.exercise_type %> • <%= activity.duration_minutes %> minutes</div>
                                  <%= if activity.notes && activity.notes != "" do %>
                                    <div class="text-xs text-base-content/60 mt-1"><%= activity.notes %></div>
                                  <% end %>
                                </div>
                              </div>
                            </div>
                            <div class="flex items-center gap-3">
                              <div class="text-right">
                                <div class="text-lg font-semibold text-primary"><%= activity.calories_burned %> cal</div>
                                <%= if activity.activity_time do %>
                                  <div class="text-sm text-base-content/70"><%= format_time(activity.activity_time) %></div>
                                <% end %>
                              </div>
                              <button class="btn btn-sm btn-ghost text-error hover:text-error" phx-click="delete_activity" phx-value-id={activity.id}>
                                <.icon name="hero-trash" class="size-4" />
                              </button>
                            </div>
                          </div>
                          <!-- Mobile Layout -->
                          <div class="md:hidden space-y-3">
                            <div class="flex items-center justify-between">
                              <div class="flex items-center gap-3">
                                <div class="text-xl"><%= Activity.exercise_type_icon(activity.exercise_type) %></div>
                                <h3 class="font-semibold"><%= activity.exercise_type %></h3>
                              </div>
                              <button class="btn btn-sm btn-ghost text-error hover:text-error" phx-click="delete_activity" phx-value-id={activity.id}>
                                <.icon name="hero-trash" class="size-4" />
                              </button>
                            </div>
                            <div class="space-y-1">
                              <div class="text-sm text-base-content/70"><%= activity.exercise_type %> • <%= activity.duration_minutes %> minutes</div>
                              <%= if activity.notes && activity.notes != "" do %>
                                <div class="text-xs text-base-content/60"><%= activity.notes %></div>
                              <% end %>
                            </div>
                            <div class="flex justify-between items-center">
                              <div class="text-sm font-semibold text-primary"><%= activity.calories_burned %> cal</div>
                              <%= if activity.activity_time do %>
                                <div class="text-xs text-base-content/70"><%= format_time(activity.activity_time) %></div>
                              <% end %>
                            </div>
                          </div>
                        </div>
                      </div>
                    <% end %>
                  <% end %>
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
                      <%= for {day_summary, _index} <- Enum.with_index(@weekly_summary.daily_summaries) do %>
                        <div class={get_week_day_class(day_summary.date, @selected_date)}>
                          <div class="text-sm font-medium"><%= get_day_name(day_summary.date) %></div>
                          <div class={get_status_class(day_summary.total_duration)}>
                            <%= if day_summary.total_duration > 0, do: "✓", else: "-" %>
                          </div>
                          <div class="text-xs text-base-content/70">
                            <%= if Date.compare(day_summary.date, @selected_date) == :eq do %>
                              Today
                            <% else %>
                              <%= if day_summary.total_duration > 0, do: "#{day_summary.total_duration} min", else: "Rest" %>
                            <% end %>
                          </div>
                        </div>
                      <% end %>
                    </div>
                    <!-- Mobile Layout -->
                    <div class="md:hidden">
                      <div class="grid grid-cols-4 gap-1">
                        <%= for {day_summary, _index_day} <- Enum.with_index(@weekly_summary.daily_summaries, 4) do %>
                          <div class={get_mobile_week_day_class(day_summary.date, @selected_date)}>
                            <div class="text-xs font-medium"><%= get_day_name(day_summary.date) %></div>
                            <div class={get_mobile_status_class(day_summary.total_duration)}>
                              <%= if day_summary.total_duration > 0, do: "✓", else: "-" %>
                            </div>
                            <div class="text-xs text-base-content/70">
                              <%= if day_summary.total_duration > 0, do: "#{day_summary.total_duration}", else: "0" %>
                            </div>
                          </div>
                        <% end %>
                      </div>
                      <div class="grid grid-cols-3 gap-1 mt-1">
                        <%= for {day_summary, _index} <- Enum.drop(@weekly_summary.daily_summaries, 4) do %>
                          <div class={get_mobile_week_day_class(day_summary.date, @selected_date)}>
                            <div class="text-xs font-medium"><%= get_day_name(day_summary.date) %></div>
                            <div class={get_mobile_status_class(day_summary.total_duration)}>
                              <%= if day_summary.total_duration > 0, do: "✓", else: "-" %>
                            </div>
                            <div class="text-xs text-base-content/70">
                              <%= if Date.compare(day_summary.date, @selected_date) == :eq do %>
                                Today
                              <% else %>
                                <%= if day_summary.total_duration > 0, do: "#{day_summary.total_duration}", else: "Rest" %>
                              <% end %>
                            </div>
                          </div>
                        <% end %>
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
