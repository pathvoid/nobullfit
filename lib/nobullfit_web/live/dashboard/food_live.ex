defmodule NobullfitWeb.Dashboard.FoodLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.CoreComponents
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]
  import NobullfitWeb.Components.Sidebar, only: [sidebar: 1]
  import NobullfitWeb.Layouts, only: [flash_group: 1]

  alias Nobullfit.FoodEntries
  alias Nobullfit.FoodEntries.FoodEntry

  on_mount {NobullfitWeb.UserAuth, :require_authenticated}

  @impl true
  def mount(_params, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})

    # Initialize with UTC defaults - will be updated when timezone data is received from client
    user_timezone = "UTC"
    local_date = nil
    today = Date.utc_today()

    # Load today's food entries and nutrition summary
    food_entries =
      FoodEntries.get_user_food_entries_for_date(socket.assigns.current_scope.user.id, today)

    nutrition_summary =
      FoodEntries.get_user_daily_nutrition_summary(socket.assigns.current_scope.user.id, today)

    socket =
      assign(socket,
        page_title: "Food Tracking",
        current_path: "/d/food",
        maintenance_status: maintenance_status,
        selected_date: today,
        user_timezone: user_timezone,
        user_local_date: local_date,
        max_date: (if local_date, do: local_date, else: today |> Date.to_string()),
        food_entries: food_entries,
        nutrition_summary: nutrition_summary
      )

    {:ok, socket}
  end

  @impl true
  def handle_event("change_date", params, socket) do
    # Prioritize "date" parameter (from Today button) over "value" parameter (from date picker)
    date_str = Map.get(params, "date") || Map.get(params, "value")

    case Date.from_iso8601(date_str) do
      {:ok, date} ->
        # Check if the date is in the future (using local date as reference)
        today =
          case socket.assigns.user_local_date do
            nil ->
              socket.assigns.selected_date

            local_date_str ->
              case Date.from_iso8601(local_date_str) do
                {:ok, date} -> date
                {:error, _} -> socket.assigns.selected_date
              end
          end

        if Date.compare(date, today) == :gt do
          {:noreply, put_flash(socket, :error, "Cannot select future dates.")}
        else
          # Reload food entries and nutrition summary for the new date
          food_entries =
            FoodEntries.get_user_food_entries_for_date(socket.assigns.current_scope.user.id, date)

          nutrition_summary =
            FoodEntries.get_user_daily_nutrition_summary(socket.assigns.current_scope.user.id, date)

          socket =
            assign(socket,
              selected_date: date,
              food_entries: food_entries,
              nutrition_summary: nutrition_summary
            )

          {:noreply, socket}
        end

      {:error, _} ->
        {:noreply, put_flash(socket, :error, "Invalid date format.")}
    end
  end

  def handle_event("timezone-data", %{"timezone" => timezone, "localDate" => local_date}, socket) do
    # Update the socket assigns with the timezone data
    selected_date =
      case Date.from_iso8601(local_date) do
        {:ok, date} -> date
        {:error, _} -> Date.utc_today()
      end

    # Reload food data with the correct date
    food_entries =
      FoodEntries.get_user_food_entries_for_date(socket.assigns.current_scope.user.id, selected_date)

    nutrition_summary =
      FoodEntries.get_user_daily_nutrition_summary(socket.assigns.current_scope.user.id, selected_date)

    socket =
      assign(socket,
        user_timezone: timezone,
        user_local_date: local_date,
        selected_date: selected_date,
        max_date: local_date,
        food_entries: food_entries,
        nutrition_summary: nutrition_summary
      )

    {:noreply, socket}
  end

  def handle_event("delete_food", %{"id" => id}, socket) do
    food_entry =
      FoodEntries.get_user_food_entry!(socket.assigns.current_scope.user.id, String.to_integer(id))

    case FoodEntries.delete_food_entry(food_entry) do
      {:ok, _} ->
        # Reload food entries and nutrition summary
        food_entries =
          FoodEntries.get_user_food_entries_for_date(
            socket.assigns.current_scope.user.id,
            socket.assigns.selected_date
          )

        nutrition_summary =
          FoodEntries.get_user_daily_nutrition_summary(
            socket.assigns.current_scope.user.id,
            socket.assigns.selected_date
          )

        socket =
          assign(socket,
            food_entries: food_entries,
            nutrition_summary: nutrition_summary
          )

        {:noreply, put_flash(socket, :info, "Food deleted successfully!")}

      {:error, _} ->
        {:noreply, put_flash(socket, :error, "Failed to delete food.")}
    end
  end

  defp group_food_entries_by_meal(food_entries) do
    food_entries
    |> Enum.group_by(& &1.meal_type)
    |> Map.new(fn {meal_type, entries} -> {meal_type, entries} end)
  end

  defp get_meal_display_name(meal_type) do
    case meal_type do
      "breakfast" -> "Breakfast"
      "lunch" -> "Lunch"
      "dinner" -> "Dinner"
      "snack" -> "Snacks"
      _ -> String.capitalize(meal_type)
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
                  Food Tracking
                  <:subtitle>Track your daily nutrition and meals</:subtitle>
                  <:actions>
                    <div class="hidden md:flex items-center gap-2">
                      <input
                        type="date"
                        class="input input-sm input-bordered"
                        value={@selected_date |> Date.to_string()}
                        max={@max_date}
                        id="desktop-date-picker"
                        phx-hook="DatePicker"
                      />
                      <button
                        class="btn btn-sm btn-info"
                        phx-click="change_date"
                        phx-value-date={@max_date}
                      >
                        Today
                      </button>
                    </div>
                  </:actions>
                </.header>
                <!-- Mobile Date Picker -->
                <div class="md:hidden mt-4">
                  <div class="flex items-center gap-2 justify-center">
                    <input
                      type="date"
                      class="input input-sm input-bordered"
                      value={@selected_date |> Date.to_string()}
                      max={@max_date}
                      id="mobile-date-picker"
                      phx-hook="DatePicker"
                    />
                    <button
                      class="btn btn-sm btn-info"
                      phx-click="change_date"
                      phx-value-date={@max_date}
                    >
                      Today
                    </button>
                  </div>
                </div>
              </div>

              <!-- Today's Summary -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="stat bg-base-200 rounded-lg">
                  <div class="stat-title">Calories</div>
                  <div class="stat-value text-primary">
                    {FoodEntry.format_calories(@nutrition_summary.total_calories)}
                  </div>
                </div>
                <div class="stat bg-base-200 rounded-lg">
                  <div class="stat-title">Protein</div>
                  <div class="stat-value text-secondary">
                    {FoodEntry.format_protein(@nutrition_summary.total_protein)}
                  </div>
                </div>
                <div class="stat bg-base-200 rounded-lg">
                  <div class="stat-title">Carbs</div>
                  <div class="stat-value text-accent">
                    {FoodEntry.format_carbs(@nutrition_summary.total_carbs)}
                  </div>
                </div>
              </div>

              <!-- Today's Meals -->
              <div class="space-y-4 mt-8">
                <.header size="md">
                  Today's Meals
                  <:subtitle>Add foods to track your daily nutrition</:subtitle>
                </.header>

                <%= for meal_type <- ["breakfast", "lunch", "dinner", "snack"] do %>
                  <% meal_entries = group_food_entries_by_meal(@food_entries)[meal_type] || [] %>
                  <div class="card bg-base-200 shadow-sm">
                    <div class="card-body">
                      <div class="flex justify-between items-center">
                        <h3 class="card-title text-base">
                          <%= get_meal_display_name(meal_type) %>
                        </h3>
                        <.link
                          navigate={
                            ~p"/d/add-food?meal_type=#{meal_type}&date=#{@selected_date |> Date.to_string()}"
                          }
                          class="btn btn-sm btn-ghost"
                        >
                          Add Food
                        </.link>
                      </div>
                      <%= if Enum.empty?(meal_entries) do %>
                        <div class="text-sm text-base-content/70">No foods added yet</div>
                      <% else %>
                        <div class="space-y-3 mt-4">
                          <%= for food_entry <- meal_entries do %>
                            <div class="flex justify-between items-center p-3 bg-base-100 rounded-lg">
                              <div class="flex-1">
                                <div class="font-medium">
                                  <%= food_entry.name %>
                                </div>
                                <div class="text-sm text-base-content/70">
                                  <%= FoodEntry.format_calories(food_entry.calories) %> calories •
                                  <%= FoodEntry.format_protein(food_entry.protein) %> protein •
                                  <%= FoodEntry.format_carbs(food_entry.carbs) %> carbs
                                </div>
                              </div>
                              <button
                                class="btn btn-sm btn-ghost text-error hover:text-error"
                                phx-click="delete_food"
                                phx-value-id={food_entry.id}
                              >
                                <.icon name="hero-trash" class="size-4" />
                              </button>
                            </div>
                          <% end %>
                        </div>
                      <% end %>
                    </div>
                  </div>
                <% end %>
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
