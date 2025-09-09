defmodule NobullfitWeb.Dashboard.AddFoodLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.CoreComponents
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]
  import NobullfitWeb.Components.Sidebar, only: [sidebar: 1]
  import NobullfitWeb.Layouts, only: [flash_group: 1]

  alias Nobullfit.FoodEntries
  alias Nobullfit.FoodEntries.FoodEntry

  on_mount {NobullfitWeb.UserAuth, :require_authenticated}

  @impl true
  def mount(%{"meal_type" => meal_type, "date" => date_str} = _params, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})

    # Initialize with UTC defaults - will be updated when timezone data is received from client
    user_timezone = "UTC"
    local_date = nil

    # Parse the date from the URL parameter
    # The date from the URL should be treated as the user's local date
    selected_date =
      case Date.from_iso8601(date_str) do
        {:ok, date} -> date
        {:error, _} -> Date.utc_today()
      end

    # Create empty food changeset for the form with default meal type
    food_changeset = FoodEntries.change_food_entry(%FoodEntry{meal_type: meal_type})

    # Get user's previous food entries for navigation
    user_id = socket.assigns.current_scope.user.id
    previous_entries = FoodEntries.get_user_food_entries_for_navigation(user_id)

    socket =
      assign(socket,
        page_title: "Add Food",
        current_path: "/d/add-food",
        maintenance_status: maintenance_status,
        selected_date: selected_date,
        user_timezone: user_timezone,
        user_local_date: local_date,
        max_date: (if local_date, do: local_date, else: selected_date |> Date.to_string()),
        food_changeset: food_changeset,
        food_form: to_form(food_changeset),
        food_submitted: false,
        quantity_info: "",
        has_date_from_url: true,
        previous_entries: previous_entries,
        current_entry_index: -1,
        is_navigating_previous: false,
        original_form_data: nil,
        original_quantity_info: nil,
        original_form_params: nil
      )

    {:ok, socket}
  end

  def mount(%{"meal_type" => meal_type} = _params, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})

    # Initialize with UTC defaults - will be updated when timezone data is received from client
    user_timezone = "UTC"
    local_date = nil
    today = Date.utc_today()

    # Create empty food changeset for the form with default meal type
    food_changeset = FoodEntries.change_food_entry(%FoodEntry{meal_type: meal_type})

    # Get user's previous food entries for navigation
    user_id = socket.assigns.current_scope.user.id
    previous_entries = FoodEntries.get_user_food_entries_for_navigation(user_id)

    socket =
      assign(socket,
        page_title: "Add Food",
        current_path: "/d/add-food",
        maintenance_status: maintenance_status,
        selected_date: today,
        user_timezone: user_timezone,
        user_local_date: local_date,
        max_date: (if local_date, do: local_date, else: today |> Date.to_string()),
        food_changeset: food_changeset,
        food_form: to_form(food_changeset),
        food_submitted: false,
        has_date_from_url: false,
        previous_entries: previous_entries,
        current_entry_index: -1,
        is_navigating_previous: false,
        original_form_data: nil,
        original_quantity_info: nil,
        original_form_params: nil
      )

    {:ok, socket}
  end

  # Handle query parameters for pre-filling food data
  def mount(%{"food_name" => food_name} = params, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})

    # Initialize with UTC defaults - will be updated when timezone data is received from client
    user_timezone = "UTC"
    local_date = nil
    today = Date.utc_today()

    # Create food changeset with pre-filled data from query parameters
    food_entry = %FoodEntry{
      name: food_name,
      calories: Map.get(params, "calories", "") |> parse_decimal(),
      protein: Map.get(params, "protein", "") |> parse_decimal(),
      carbs: Map.get(params, "carbs", "") |> parse_decimal()
    }

    food_changeset = FoodEntries.change_food_entry(food_entry)

    # Get quantity information if provided
    quantity_info = Map.get(params, "quantity", "")

    # Get user's previous food entries for navigation
    user_id = socket.assigns.current_scope.user.id
    previous_entries = FoodEntries.get_user_food_entries_for_navigation(user_id)

    socket =
      assign(socket,
        page_title: "Add Food",
        current_path: "/d/add-food",
        maintenance_status: maintenance_status,
        selected_date: today,
        user_timezone: user_timezone,
        user_local_date: local_date,
        max_date: (if local_date, do: local_date, else: today |> Date.to_string()),
        food_changeset: food_changeset,
        food_form: to_form(food_changeset),
        food_submitted: false,
        quantity_info: quantity_info,
        has_date_from_url: false,
        previous_entries: previous_entries,
        current_entry_index: -1,
        is_navigating_previous: false,
        original_form_data: nil,
        original_quantity_info: quantity_info,
        original_form_params: nil
      )

    {:ok, socket}
  end

  def mount(_params, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})

    # Initialize with UTC defaults - will be updated when timezone data is received from client
    user_timezone = "UTC"
    local_date = nil
    today = Date.utc_today()

    # Create empty food changeset for the form
    food_changeset = FoodEntries.change_food_entry(%FoodEntry{})

    # Get user's previous food entries for navigation
    user_id = socket.assigns.current_scope.user.id
    previous_entries = FoodEntries.get_user_food_entries_for_navigation(user_id)

    socket =
      assign(socket,
        page_title: "Add Food",
        current_path: "/d/add-food",
        maintenance_status: maintenance_status,
        selected_date: today,
        user_timezone: user_timezone,
        user_local_date: local_date,
        max_date: (if local_date, do: local_date, else: today |> Date.to_string()),
        food_changeset: food_changeset,
        food_form: to_form(food_changeset),
        food_submitted: false,
        quantity_info: "",
        has_date_from_url: false,
        previous_entries: previous_entries,
        current_entry_index: -1,
        is_navigating_previous: false,
        original_form_data: nil,
        original_quantity_info: nil,
        original_form_params: nil
      )

    {:ok, socket}
  end

  # Helper functions for parsing query parameters
  defp parse_decimal(value) when is_binary(value) and value != "" do
    case Decimal.parse(value) do
      {decimal, _} -> decimal
      :error -> nil
    end
  end

  defp parse_decimal(_), do: nil

  @impl true
  def handle_event("save_food", %{"food_entry" => food_params}, socket) do
    # Add user_id and current date to the params
    food_params =
      food_params
      |> Map.merge(%{
        "user_id" => socket.assigns.current_scope.user.id,
        "entry_date" => socket.assigns.selected_date
      })

    case FoodEntries.create_food_entry(food_params) do
      {:ok, _food_entry} ->
        # Create new empty changeset for the form and reset it
        food_changeset = FoodEntries.change_food_entry(%FoodEntry{})
        food_form = to_form(food_changeset)

        # Refresh the previous entries list to include the newly added entry
        user_id = socket.assigns.current_scope.user.id
        previous_entries = FoodEntries.get_user_food_entries_for_navigation(user_id)

        socket =
          assign(socket,
            food_changeset: food_changeset,
            food_form: food_form,
            food_submitted: false,
            previous_entries: previous_entries,
            current_entry_index: -1,
            is_navigating_previous: false,
            original_form_data: nil,
            original_quantity_info: nil,
            original_form_params: nil
          )

        {:noreply, socket |> put_flash(:info, "Food added successfully!") |> push_navigate(to: ~p"/d/food")}

      {:error, %Ecto.Changeset{} = changeset} ->
        socket =
          assign(socket,
            food_changeset: changeset,
            food_form: to_form(changeset, action: :insert),
            food_submitted: true
          )

        {:noreply, socket}
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
          socket = assign(socket, selected_date: date)
          {:noreply, socket}
        end

      {:error, _} ->
        {:noreply, put_flash(socket, :error, "Invalid date format.")}
    end
  end

  def handle_event("validate", %{"food_entry" => food_params}, socket) do
    # Update the changeset with the current form data
    food_changeset = FoodEntries.change_food_entry(%FoodEntry{}, food_params)
    food_form = to_form(food_changeset, action: :validate)

    socket =
      assign(socket,
        food_changeset: food_changeset,
        food_form: food_form
      )

    {:noreply, socket}
  end

  def handle_event("timezone-data", %{"timezone" => timezone, "localDate" => local_date}, socket) do
    # Update the socket assigns with the timezone data
    # Only update selected_date if we don't have a date from URL parameters
    # This prevents overriding the date passed from the food tracking page
    socket =
      if socket.assigns.has_date_from_url do
        # If we have a date from URL, only update timezone info, not the selected date
        assign(socket,
          user_timezone: timezone,
          user_local_date: local_date,
          max_date: local_date
        )
      else
        # If no date from URL, use the user's local date
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
      end

    {:noreply, socket}
  end

  def handle_event("navigate_previous", _params, socket) do
    entries = socket.assigns.previous_entries
    current_index = socket.assigns.current_entry_index

    if current_index < length(entries) - 1 do
      new_index = current_index + 1
      entry = Enum.at(entries, new_index)

      # Always save current form data before navigating (captures any user edits)
      socket =
        assign(socket,
          original_form_data: socket.assigns.food_changeset.data,
          original_quantity_info: socket.assigns.quantity_info,
          original_form_params: socket.assigns.food_changeset.params
        )

      # Create a new changeset with the previous entry data but keep current date
      entry_with_current_date = %{entry | entry_date: socket.assigns.selected_date}
      food_changeset = FoodEntries.change_food_entry(entry_with_current_date)
      food_form = to_form(food_changeset)

      socket =
        assign(socket,
          food_changeset: food_changeset,
          food_form: food_form,
          current_entry_index: new_index,
          is_navigating_previous: true,
          quantity_info: ""  # Hide quantity_info when navigating to previous entries
        )

      {:noreply, socket}
    else
      {:noreply, socket}
    end
  end

  def handle_event("navigate_next", _params, socket) do
    current_index = socket.assigns.current_entry_index

    if current_index > 0 do
      new_index = current_index - 1
      entries = socket.assigns.previous_entries
      entry = Enum.at(entries, new_index)

      # Save current form data before navigating (captures any user edits)
      socket =
        assign(socket,
          original_form_data: socket.assigns.food_changeset.data,
          original_quantity_info: socket.assigns.quantity_info,
          original_form_params: socket.assigns.food_changeset.params
        )

      # Create a new changeset with the next entry data but keep current date
      entry_with_current_date = %{entry | entry_date: socket.assigns.selected_date}
      food_changeset = FoodEntries.change_food_entry(entry_with_current_date)
      food_form = to_form(food_changeset)

      socket =
        assign(socket,
          food_changeset: food_changeset,
          food_form: food_form,
          current_entry_index: new_index,
          is_navigating_previous: true,
          quantity_info: ""  # Hide quantity_info when navigating to previous entries
        )

      {:noreply, socket}
    else
      # If we're at the beginning, restore original form data
      handle_event("restore_original_form", %{}, socket)
    end
  end

  def handle_event("restore_original_form", _params, socket) do
    # Restore the original form data if it exists
    original_data = socket.assigns.original_form_data
    original_quantity_info = socket.assigns.original_quantity_info
    original_form_params = socket.assigns.original_form_params

    if original_data do
      # Restore the original form data using params if available, otherwise use data
      food_changeset =
        if original_form_params do
          FoodEntries.change_food_entry(%FoodEntry{}, original_form_params)
        else
          FoodEntries.change_food_entry(original_data)
        end
      food_form = to_form(food_changeset)

      socket =
        assign(socket,
          food_changeset: food_changeset,
          food_form: food_form,
          current_entry_index: -1,
          is_navigating_previous: false,
          food_submitted: false,
          quantity_info: original_quantity_info || "",
          original_form_data: nil,
          original_quantity_info: nil,
          original_form_params: nil
        )

      {:noreply, socket}
    else
      # If no original data, just clear the form
      handle_event("clear_form", %{}, socket)
    end
  end

  def handle_event("clear_form", _params, socket) do
    # Create empty food changeset for the form
    food_changeset = FoodEntries.change_food_entry(%FoodEntry{})
    food_form = to_form(food_changeset)

    socket =
      assign(socket,
        food_changeset: food_changeset,
        food_form: food_form,
        current_entry_index: -1,
        is_navigating_previous: false,
        food_submitted: false,
        quantity_info: "",
        original_form_data: nil,
        original_quantity_info: nil,
        original_form_params: nil
      )

    {:noreply, socket}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-base-100 flex flex-col" id="main-container" phx-hook="TimezoneData">
      <.navigation current_scope={@current_scope} current_path={@current_path} maintenance_status={@maintenance_status} user_agent={@user_agent} />
      <div class="flex flex-1">
        <.sidebar current_path={@current_path} />
        <div class="flex-1">
          <main class="px-4 py-8 md:py-12">
            <div class="max-w-4xl mx-auto space-y-8">
              <!-- Header Section -->
              <div>
                <.header centered={true} actions_right={true}>
                  Add Food
                  <:subtitle>Add a new food item to your daily nutrition</:subtitle>
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

              <!-- Previous Entries Navigation -->
              <%= if length(@previous_entries) > 0 do %>
                <div class="card bg-base-200 shadow-sm">
                  <div class="card-body">
                    <!-- Mobile Layout -->
                    <div class="md:hidden space-y-4">
                      <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold">Previous Entries</h3>
                        <%= if @is_navigating_previous do %>
                          <span class="badge badge-info text-xs">
                            <%= if @current_entry_index >= 0 do %>
                              <%= @current_entry_index + 1 %>/<%= length(@previous_entries) %>
                            <% else %>
                              New
                            <% end %>
                          </span>
                        <% end %>
                      </div>
                      <div class="flex gap-2 justify-center">
                        <button
                          type="button"
                          class="btn btn-sm flex-1"
                          phx-click="navigate_previous"
                          disabled={@current_entry_index >= length(@previous_entries) - 1}
                        >
                          ← Previous
                        </button>
                        <button
                          type="button"
                          class="btn btn-sm flex-1"
                          phx-click="navigate_next"
                          disabled={@current_entry_index < 0}
                        >
                          Next →
                        </button>
                      </div>
                    </div>

                    <!-- Desktop Layout -->
                    <div class="hidden md:flex items-center justify-between">
                      <div class="flex items-center gap-4">
                        <h3 class="text-lg font-semibold">Previous Entries</h3>
                        <%= if @is_navigating_previous do %>
                          <span class="badge badge-info">
                            <%= if @current_entry_index >= 0 do %>
                              Entry <%= @current_entry_index + 1 %> of <%= length(@previous_entries) %>
                            <% else %>
                              New Entry
                            <% end %>
                          </span>
                        <% end %>
                      </div>
                      <div class="flex gap-2">
                        <button
                          type="button"
                          class="btn btn-sm"
                          phx-click="navigate_previous"
                          disabled={@current_entry_index >= length(@previous_entries) - 1}
                        >
                          ← Previous
                        </button>
                        <button
                          type="button"
                          class="btn btn-sm"
                          phx-click="navigate_next"
                          disabled={@current_entry_index < 0}
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                    <%= if @is_navigating_previous and @current_entry_index >= 0 do %>
                      <div class="mt-4 p-3 bg-base-100 rounded-lg">
                        <p class="text-sm text-base-content/70">
                          Currently viewing: <strong><%= Enum.at(@previous_entries, @current_entry_index).name %></strong>
                          (originally added on <%= Enum.at(@previous_entries, @current_entry_index).entry_date %>)
                        </p>
                      </div>
                    <% end %>
                  </div>
                </div>
              <% end %>

              <!-- Food Form -->
              <div class="card bg-base-200 shadow-sm">
                <div class="card-body">
                  <%= if @quantity_info != "" do %>
                    <div class="alert alert-info mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <span>Quantity: <strong><%= @quantity_info %></strong></span>
                    </div>
                  <% end %>
                  <.form for={@food_form} phx-submit="save_food" phx-change="validate" id="food-form" novalidate>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <!-- Basic Information -->
                      <div class="space-y-4">
                        <h3 class="text-lg font-semibold">Basic Information</h3>

                        <fieldset class="fieldset">
                          <legend class="fieldset-legend">Food Name</legend>
                          <.input
                            field={@food_form[:name]}
                            type="text"
                            class={
                              if @food_submitted && @food_changeset.errors[:name],
                                do: "input input-bordered input-error",
                                else: "input input-bordered"
                            }
                            placeholder="e.g., Grilled Chicken Breast"
                          />
                        </fieldset>

                        <fieldset class="fieldset">
                          <legend class="fieldset-legend">Meal Type</legend>
                          <.input
                            field={@food_form[:meal_type]}
                            type="select"
                            class={
                              if @food_submitted && @food_changeset.errors[:meal_type],
                                do: "select select-bordered select-error w-full",
                                else: "select select-bordered w-full"
                            }
                            options={[
                              {"Breakfast", "breakfast"},
                              {"Lunch", "lunch"},
                              {"Dinner", "dinner"},
                              {"Snack", "snack"}
                            ]}
                          />
                        </fieldset>
                      </div>

                      <!-- Nutrition Information -->
                      <div class="space-y-4">
                        <h3 class="text-lg font-semibold">Nutrition Information</h3>

                        <fieldset class="fieldset">
                          <legend class="fieldset-legend">Calories</legend>
                          <.input
                            field={@food_form[:calories]}
                            type="number"
                            class={
                              if @food_submitted && @food_changeset.errors[:calories],
                                do: "input input-bordered input-error",
                                else: "input input-bordered"
                            }
                            placeholder="165"
                            step="0.1"
                          />
                        </fieldset>

                        <div class="grid grid-cols-2 gap-4">
                          <fieldset class="fieldset">
                            <legend class="fieldset-legend">Protein (g)</legend>
                            <.input
                              field={@food_form[:protein]}
                              type="number"
                              class={
                                if @food_submitted && @food_changeset.errors[:protein],
                                  do: "input input-bordered input-error",
                                  else: "input input-bordered"
                              }
                              placeholder="31"
                              step="0.1"
                            />
                          </fieldset>

                          <fieldset class="fieldset">
                            <legend class="fieldset-legend">Carbs (g)</legend>
                            <.input
                              field={@food_form[:carbs]}
                              type="number"
                              class={
                                if @food_submitted && @food_changeset.errors[:carbs],
                                  do: "input input-bordered input-error",
                                  else: "input input-bordered"
                              }
                              placeholder="0"
                              step="0.1"
                            />
                          </fieldset>
                        </div>
                      </div>
                    </div>

                    <!-- Submit Button -->
                    <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
                      <div class="flex gap-2 w-full sm:w-auto">
                        <.link navigate={~p"/d/favorites"} class="btn btn-accent w-full sm:w-auto">
                          View Favorites
                        </.link>
                      </div>
                      <div class="flex gap-4 w-full sm:w-auto">
                        <button
                          type="button"
                          class="btn btn-ghost flex-1 sm:flex-none"
                          phx-click="clear_form"
                        >
                          Clear
                        </button>
                        <button type="submit" class="btn btn-primary flex-1 sm:flex-none">
                          Add Food
                        </button>
                      </div>
                    </div>
                  </.form>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <.footer current_path={@current_path} user_agent={@user_agent} />
      <.flash_group flash={@flash} />
    </div>
    """
  end
end
