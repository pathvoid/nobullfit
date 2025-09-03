defmodule NobullfitWeb.DashboardLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.CoreComponents
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]
  import NobullfitWeb.Components.Sidebar, only: [sidebar: 1]
  import NobullfitWeb.Layouts, only: [flash_group: 1]

  on_mount {NobullfitWeb.UserAuth, :require_authenticated}

  # Helper functions to check data availability
  defp has_any_data?(weekly_nutrition, macronutrient_breakdown, meal_distribution, weight_entries, activities) do
    has_nutrition_data?(weekly_nutrition, macronutrient_breakdown, meal_distribution) or
      has_activity_or_weight_data?(weight_entries, activities)
  end

  defp has_nutrition_data?(weekly_nutrition, macronutrient_breakdown, meal_distribution) do
    has_weekly_calories_data?(weekly_nutrition) or
      has_macronutrient_data?(macronutrient_breakdown) or
      has_meal_distribution_data?(meal_distribution)
  end

  defp has_weekly_calories_data?(weekly_nutrition) do
    weekly_nutrition.daily_summaries
    |> Enum.any?(fn summary ->
      Decimal.gt?(summary.calories, Decimal.new("0"))
    end)
  end

  defp has_macronutrient_data?(macronutrient_breakdown) do
    Decimal.gt?(macronutrient_breakdown.total_calories, Decimal.new("0"))
  end

  defp has_meal_distribution_data?(meal_distribution) do
    length(meal_distribution) > 0
  end

  defp has_activity_or_weight_data?(weight_entries, activities) do
    length(weight_entries) > 0 or length(activities) > 0
  end

  @impl true
  def mount(_params, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})
    user_agent = Map.get(session, "user_agent", "") || Map.get(session, :user_agent, "")

    # Initialize with UTC defaults - will be updated when timezone data is received from client
    user_timezone = "UTC"
    local_date = nil
    today = Date.utc_today()

    # Get user's weight entries for the chart
    weight_entries = Nobullfit.WeightEntries.list_user_weight_entries(socket.assigns.current_scope.user.id)
    weight_summary = Nobullfit.WeightEntries.get_user_weight_summary(socket.assigns.current_scope.user.id)

    # Transform weight entries for JSON encoding, keeping only the most recent entry per date
    # and converting all entries to the user's most recent unit preference
    grouped_entries =
      weight_entries
      |> Enum.group_by(& &1.entry_date)
      |> Enum.map(fn {date, entries} ->
        # Get the most recent entry for this date (sorted by inserted_at desc)
        most_recent = Enum.max_by(entries, & &1.inserted_at, DateTime)
        {date, most_recent}
      end)
      |> Enum.sort_by(fn {date, _entry} -> date end, Date)

    # Get the most recent unit preference from the latest entry
    target_unit =
      case grouped_entries do
        [] -> "kg"  # Default to kg if no entries
        entries ->
          {_date, latest_entry} = List.last(entries)
          latest_entry.unit
      end

    weight_data =
      grouped_entries
      |> Enum.map(fn {_date, entry} ->
        # Convert weight to target unit if necessary
        converted_weight =
          if entry.unit == target_unit do
            entry.weight
          else
            # Convert through kg as intermediate
            weight_kg = Nobullfit.WeightEntries.WeightEntry.to_kg(entry.weight, entry.unit)
            Nobullfit.WeightEntries.WeightEntry.from_kg(weight_kg, target_unit)
          end

        %{
          id: entry.id,
          weight: Decimal.to_string(converted_weight),
          unit: target_unit,  # All entries use the same unit now
          entry_date: Date.to_string(entry.entry_date)
        }
      end)

    # Get user's activities for current month
    start_of_month = Date.new!(today.year, today.month, 1)
    activities = Nobullfit.Activities.list_user_activities_in_range(socket.assigns.current_scope.user.id, start_of_month, today)

    # Get food/nutrition data
    start_of_week = Date.add(today, -6)  # Get last 7 days
    weekly_nutrition = Nobullfit.FoodEntries.get_user_weekly_nutrition_summary(socket.assigns.current_scope.user.id, start_of_week)
    macronutrient_breakdown = Nobullfit.FoodEntries.get_user_macronutrient_breakdown(socket.assigns.current_scope.user.id, today)
    meal_distribution = Nobullfit.FoodEntries.get_user_meal_distribution(socket.assigns.current_scope.user.id, today)

    # Transform nutrition data for JSON encoding
    weekly_nutrition_data = %{
      start_date: Date.to_string(weekly_nutrition.start_date),
      end_date: Date.to_string(weekly_nutrition.end_date),
      daily_summaries:
        Enum.map(weekly_nutrition.daily_summaries, fn summary ->
          %{
            date: Date.to_string(summary.date),
            calories: Decimal.to_string(summary.calories),
            protein: Decimal.to_string(summary.protein),
            carbs: Decimal.to_string(summary.carbs),
            food_count: summary.food_count || 0
          }
        end)
    }

    macronutrient_data = %{
      protein: Decimal.to_string(macronutrient_breakdown.protein),
      carbs: Decimal.to_string(macronutrient_breakdown.carbs),
      fat: Decimal.to_string(macronutrient_breakdown.fat),
      total_calories: Decimal.to_string(macronutrient_breakdown.total_calories)
    }

    meal_distribution_data =
      Enum.map(meal_distribution, fn meal ->
        %{
          meal_type: meal.meal_type,
          calories: Decimal.to_string(meal.calories),
          food_count: meal.food_count || 0
        }
      end)

    {:ok,
      assign(socket,
        page_title: "Dashboard",
        current_path: "/d",
        maintenance_status: maintenance_status,
        user_agent: user_agent,
        user_timezone: user_timezone,
        user_local_date: local_date,
        weight_entries: weight_entries,
        weight_data: weight_data,
        weight_summary: weight_summary,
        activities: activities,
        weekly_nutrition: weekly_nutrition,
        weekly_nutrition_data: weekly_nutrition_data,
        macronutrient_breakdown: macronutrient_breakdown,
        macronutrient_data: macronutrient_data,
        meal_distribution: meal_distribution,
        meal_distribution_data: meal_distribution_data
      )}
  end

  @impl true
  def handle_event("timezone-data", %{"timezone" => timezone, "localDate" => local_date}, socket) do
    # Update the socket assigns with the timezone data
    today =
      case Date.from_iso8601(local_date) do
        {:ok, date} -> date
        {:error, _} -> Date.utc_today()
      end

    # Recalculate data with the correct date
    start_of_month = Date.new!(today.year, today.month, 1)
    activities = Nobullfit.Activities.list_user_activities_in_range(socket.assigns.current_scope.user.id, start_of_month, today)

    # Get food/nutrition data
    start_of_week = Date.add(today, -6)  # Get last 7 days
    weekly_nutrition = Nobullfit.FoodEntries.get_user_weekly_nutrition_summary(socket.assigns.current_scope.user.id, start_of_week)
    macronutrient_breakdown = Nobullfit.FoodEntries.get_user_macronutrient_breakdown(socket.assigns.current_scope.user.id, today)
    meal_distribution = Nobullfit.FoodEntries.get_user_meal_distribution(socket.assigns.current_scope.user.id, today)

    # Transform nutrition data for JSON encoding
    weekly_nutrition_data = %{
      start_date: Date.to_string(weekly_nutrition.start_date),
      end_date: Date.to_string(weekly_nutrition.end_date),
      daily_summaries:
        Enum.map(weekly_nutrition.daily_summaries, fn summary ->
          %{
            date: Date.to_string(summary.date),
            calories: Decimal.to_string(summary.calories),
            protein: Decimal.to_string(summary.protein),
            carbs: Decimal.to_string(summary.carbs),
            food_count: summary.food_count || 0
          }
        end)
    }

    macronutrient_data = %{
      protein: Decimal.to_string(macronutrient_breakdown.protein),
      carbs: Decimal.to_string(macronutrient_breakdown.carbs),
      fat: Decimal.to_string(macronutrient_breakdown.fat),
      total_calories: Decimal.to_string(macronutrient_breakdown.total_calories)
    }

    meal_distribution_data =
      Enum.map(meal_distribution, fn meal ->
        %{
          meal_type: meal.meal_type,
          calories: Decimal.to_string(meal.calories),
          food_count: meal.food_count || 0
        }
      end)

    socket =
      assign(socket,
        user_timezone: timezone,
        user_local_date: local_date,
        activities: activities,
        weekly_nutrition: weekly_nutrition,
        weekly_nutrition_data: weekly_nutrition_data,
        macronutrient_breakdown: macronutrient_breakdown,
        macronutrient_data: macronutrient_data,
        meal_distribution: meal_distribution,
        meal_distribution_data: meal_distribution_data
      )

    {:noreply, push_event(socket, "dashboard-data-updated", %{})}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-base-100 flex flex-col" id="main-container" phx-hook="TimezoneData">
      <div phx-hook="DashboardChart" id="dashboard-chart"
           data-weight-entries={Jason.encode!(@weight_data)}
           data-weekly-nutrition={Jason.encode!(@weekly_nutrition_data)}
           data-macronutrient-breakdown={Jason.encode!(@macronutrient_data)}
           data-meal-distribution={Jason.encode!(@meal_distribution_data)}>
        <.navigation current_scope={@current_scope} current_path={@current_path} maintenance_status={@maintenance_status} user_agent={@user_agent} />

        <div class="flex flex-1">
          <.sidebar current_path={@current_path} />

          <div class="flex-1">
            <main class="px-4 py-8 md:py-12">
              <div class="px-4 space-y-4">
                <!-- Header Section -->
                <div>
                  <.header centered={true}>
                    Dashboard
                    <:subtitle>Welcome back, {@current_scope.user.email}</:subtitle>
                  </.header>
                </div>

                <!-- Weight Progress Section -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div class="stat bg-base-200 rounded-lg">
                    <div class="stat-title">Current Weight</div>
                    {if @weight_summary.current_weight do
                      raw(~s(<div class="stat-value text-primary">
                        #{Nobullfit.WeightEntries.WeightEntry.format_weight(@weight_summary.current_weight, @weight_summary.unit)}
                      </div>))
                    else
                      raw(~s(<div class="text-base text-base-content/70">No data</div>))
                    end}
                    {if @weight_summary.difference do
                      raw(~s(<div class="stat-desc #{if Decimal.gt?(@weight_summary.difference, Decimal.new("0")), do: "text-success", else: "text-error"}">
                        #{Nobullfit.WeightEntries.WeightEntry.format_difference(@weight_summary.difference, @weight_summary.unit)}
                      </div>))
                    end}
                  </div>

                  <div class="stat bg-base-200 rounded-lg">
                    <div class="stat-title">Total Activities</div>
                    <div class="stat-value text-secondary">
                      {length(@activities)}
                    </div>
                    <div class="stat-desc">This month</div>
                  </div>

                  <div class="stat bg-base-200 rounded-lg">
                    <div class="stat-title">Calories Burned</div>
                    <div class="stat-value text-accent">
                      {Enum.reduce(@activities, 0, fn activity, acc -> acc + (activity.calories_burned || 0) end)}
                    </div>
                    <div class="stat-desc">This month</div>
                  </div>
                </div>

                <!-- Nutrition Charts Section -->
                <%= if has_nutrition_data?(@weekly_nutrition, @macronutrient_breakdown, @meal_distribution) do %>
                  <div class="flex flex-wrap gap-6 mt-8">
                    <%= if has_weekly_calories_data?(@weekly_nutrition) do %>
                      <div class="space-y-4 flex-1 min-w-[300px]">
                        <.header size="md">
                          Weekly Calories
                          <:subtitle>Last 7 days calorie intake</:subtitle>
                        </.header>

                        <div class="card bg-base-200 shadow-sm">
                          <div class="card-body">
                            <div id="weeklyCaloriesChart" style="height: 300px; width: 100%;"></div>
                          </div>
                        </div>
                      </div>
                    <% end %>

                    <%= if has_macronutrient_data?(@macronutrient_breakdown) do %>
                      <div class="space-y-4 flex-1 min-w-[300px]">
                        <.header size="md">
                          Today's Macros
                          <:subtitle>Protein, carbs, and fat breakdown</:subtitle>
                        </.header>

                        <div class="card bg-base-200 shadow-sm">
                          <div class="card-body">
                            <div id="macronutrientChart" style="height: 300px; width: 100%;"></div>
                          </div>
                        </div>
                      </div>
                    <% end %>

                    <%= if has_meal_distribution_data?(@meal_distribution) do %>
                      <div class="space-y-4 flex-1 min-w-[300px]">
                        <.header size="md">
                          Today's Meals
                          <:subtitle>Calorie distribution by meal</:subtitle>
                        </.header>

                        <div class="card bg-base-200 shadow-sm">
                          <div class="card-body">
                            <div id="mealDistributionChart" style="height: 300px; width: 100%;"></div>
                          </div>
                        </div>
                      </div>
                    <% end %>
                  </div>
                <% end %>

                <!-- Weight Progression and Recent Activities Row -->
                <%= if has_activity_or_weight_data?(@weight_entries, @activities) do %>
                  <div class="flex flex-wrap gap-6 mt-8">
                    <%= if length(@weight_entries) > 0 do %>
                      <div class="space-y-4 flex-1 min-w-[400px]">
                        <.header size="md">
                          Weight Progression
                          <:subtitle>Track your weight changes over time</:subtitle>
                        </.header>

                        <div class="card bg-base-200 shadow-sm">
                          <div class="card-body">
                            <div id="weightChart" style="height: 400px; width: 100%;"></div>
                          </div>
                        </div>
                      </div>
                    <% end %>

                    <%= if length(@activities) > 0 do %>
                      <div class="space-y-4 flex-1 min-w-[400px]">
                        <.header size="md">
                          Recent Activities
                          <:subtitle>Your latest workout sessions</:subtitle>
                        </.header>

                        <div class="card bg-base-200 shadow-sm">
                          <div class="card-body">
                            <div class="space-y-3">
                              <%= for activity <- Enum.take(@activities, 5) do %>
                                <div class="flex items-center justify-between p-3 bg-base-100 rounded-lg">
                                  <div class="flex items-center space-x-3">
                                    <span class="text-2xl"><%= Nobullfit.Activities.Activity.exercise_type_icon(activity.exercise_type) %></span>
                                    <div>
                                      <div class="font-semibold"><%= activity.exercise_type %></div>
                                      <div class="text-sm text-base-content/70"><%= Date.to_string(activity.activity_date) %></div>
                                    </div>
                                  </div>
                                  <div class="text-right">
                                    <div class="font-semibold"><%= activity.duration_minutes %> min</div>
                                    <div class="text-sm text-base-content/70"><%= activity.calories_burned %> cal</div>
                                  </div>
                                </div>
                              <% end %>
                            </div>
                          </div>
                        </div>
                      </div>
                    <% end %>
                  </div>
                <% end %>

                <!-- No Data Message -->
                <%= if not has_any_data?(@weekly_nutrition, @macronutrient_breakdown, @meal_distribution, @weight_entries, @activities) do %>
                  <div class="text-center py-12 mt-8">
                    <img src="https://cdn.nobull.fit/orange-waiting.png" alt="NoBullFit" class="w-45 h-auto mx-auto" />
                    <h3 class="text-lg font-semibold mt-4 mb-2">No data to display yet</h3>
                    <p class="text-base-content/70">Start tracking your meals, activities, and weight to see your progress insights and charts!</p>
                  </div>
                <% end %>
              </div>
            </main>
          </div>
        </div>

        <.footer current_path={@current_path} user_agent={@user_agent} />
        <.flash_group flash={@flash} />
      </div>
    </div>
    """
  end
end
