defmodule NobullfitWeb.Dashboard.GroceriesLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.CoreComponents
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]
  import NobullfitWeb.Components.Sidebar, only: [sidebar: 1]
  import NobullfitWeb.Layouts, only: [flash_group: 1]

  alias Nobullfit.GroceryLists

  on_mount {NobullfitWeb.UserAuth, :require_authenticated}

  def mount(_params, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})
    user_id = socket.assigns.current_scope.user.id

    # Load user's grocery lists
    grocery_lists = GroceryLists.list_grocery_lists(user_id)

    # Get or create active list
    case GroceryLists.get_or_create_active_list(user_id) do
      {:ok, active_list} ->
        active_list = GroceryLists.get_grocery_list!(active_list.id, user_id)

        # Create changesets for forms
        item_changeset = GroceryLists.change_grocery_item(%GroceryLists.GroceryItem{})
        list_changeset = GroceryLists.change_grocery_list(active_list)

        socket =
          assign(socket,
            page_title: "Groceries",
            current_path: "/d/groceries",
            maintenance_status: maintenance_status,
            user_timezone: nil,
            local_date: nil,
            selected_date: Date.utc_today(),
            max_date: Date.utc_today(),
            grocery_lists: grocery_lists,
            current_list: active_list,
            item_changeset: item_changeset,
            item_form: to_form(item_changeset),
            item_submitted: false,
            list_changeset: list_changeset,
            list_form: to_form(list_changeset),
            list_submitted: false,
            show_delete_confirm: false,
            list_to_delete: nil
          )

        {:ok, socket}

      {:error, _changeset} ->
        # Create changesets for forms
        item_changeset = GroceryLists.change_grocery_item(%GroceryLists.GroceryItem{})
        list_changeset = GroceryLists.change_grocery_list(%GroceryLists.GroceryList{})

        socket =
          assign(socket,
            page_title: "Groceries",
            current_path: "/d/groceries",
            maintenance_status: maintenance_status,
            user_timezone: nil,
            local_date: nil,
            selected_date: Date.utc_today(),
            max_date: Date.utc_today(),
            grocery_lists: grocery_lists,
            current_list: nil,
            item_changeset: item_changeset,
            item_form: to_form(item_changeset),
            item_submitted: false,
            list_changeset: list_changeset,
            list_form: to_form(list_changeset),
            list_submitted: false,
            show_delete_confirm: false,
            list_to_delete: nil
          )

        {:ok, socket}
    end
  end

  def handle_event("timezone-data", %{"timezone" => timezone}, socket) do
    {:noreply, assign(socket, :user_timezone, timezone)}
  end

  def handle_event("add_item", %{"grocery_item" => item_params}, socket) do
    user_id = socket.assigns.current_scope.user.id
    current_list = socket.assigns.current_list

    if current_list do
      # Add grocery_list_id to the params
      item_params = Map.merge(item_params, %{"grocery_list_id" => current_list.id})

      case GroceryLists.add_item_to_list(current_list.id, item_params) do
        {:ok, _item} ->
          # Reload the current list with items
          updated_list = GroceryLists.get_grocery_list!(current_list.id, user_id)
          grocery_lists = GroceryLists.list_grocery_lists(user_id)

          # Create new empty changeset for the form and reset it
          item_changeset = GroceryLists.change_grocery_item(%GroceryLists.GroceryItem{})
          item_form = to_form(item_changeset)

          socket =
            assign(socket,
              current_list: updated_list,
              grocery_lists: grocery_lists,
              item_changeset: item_changeset,
              item_form: item_form,
              item_submitted: false,
              show_delete_confirm: false,
              list_to_delete: nil
            )

          {:noreply, socket |> put_flash(:info, "Item added successfully!") |> push_event("reset-item-form", %{})}

        {:error, %Ecto.Changeset{} = changeset} ->
          socket =
            assign(socket,
              item_changeset: changeset,
              item_form: to_form(changeset, action: :insert),
              item_submitted: true
            )

          {:noreply, socket}
      end
    else
      {:noreply, put_flash(socket, :error, "No active list found.")}
    end
  end

  def handle_event("remove_item", %{"item_id" => item_id}, socket) do
    user_id = socket.assigns.current_scope.user.id
    current_list = socket.assigns.current_list

    if current_list do
      case GroceryLists.remove_item_from_list(item_id, current_list.id) do
        {1, _} ->
          # Reload the current list with items
          updated_list = GroceryLists.get_grocery_list!(current_list.id, user_id)
          grocery_lists = GroceryLists.list_grocery_lists(user_id)

          socket =
            socket
            |> assign(:current_list, updated_list)
            |> assign(:grocery_lists, grocery_lists)
            |> assign(:show_delete_confirm, false)
            |> assign(:list_to_delete, nil)
            |> put_flash(:info, "Item removed successfully!")

          {:noreply, socket}

        _ ->
          {:noreply, put_flash(socket, :error, "Failed to remove item.")}
      end
    else
      {:noreply, put_flash(socket, :error, "No active list found.")}
    end
  end

  def handle_event("toggle_item", %{"item_id" => item_id}, socket) do
    user_id = socket.assigns.current_scope.user.id
    current_list = socket.assigns.current_list

    if current_list do
      case GroceryLists.toggle_item_completed(item_id, current_list.id) do
        {1, _} ->
          # Reload the current list with items
          updated_list = GroceryLists.get_grocery_list!(current_list.id, user_id)
          grocery_lists = GroceryLists.list_grocery_lists(user_id)

          socket =
            socket
            |> assign(:current_list, updated_list)
            |> assign(:grocery_lists, grocery_lists)
            |> assign(:show_delete_confirm, false)
            |> assign(:list_to_delete, nil)

          {:noreply, socket}

        _ ->
          {:noreply, put_flash(socket, :error, "Failed to update item.")}
      end
    else
      {:noreply, put_flash(socket, :error, "No active list found.")}
    end
  end

  def handle_event("save_list", %{"grocery_list" => list_params}, socket) do
    user_id = socket.assigns.current_scope.user.id
    current_list = socket.assigns.current_list

    if current_list do
      case GroceryLists.update_grocery_list(current_list, list_params) do
        {:ok, updated_list} ->
          # Reload all lists to reflect the name change
          grocery_lists = GroceryLists.list_grocery_lists(user_id)

          # Create new changeset for the form and reset it
          list_changeset = GroceryLists.change_grocery_list(updated_list)
          list_form = to_form(list_changeset)

          socket =
            assign(socket,
              current_list: updated_list,
              grocery_lists: grocery_lists,
              list_changeset: list_changeset,
              list_form: list_form,
              list_submitted: false,
              show_delete_confirm: false,
              list_to_delete: nil
            )

          {:noreply, socket |> put_flash(:info, "List saved successfully!")}

        {:error, %Ecto.Changeset{} = changeset} ->
          socket =
            assign(socket,
              list_changeset: changeset,
              list_form: to_form(changeset, action: :update),
              list_submitted: true
            )

          {:noreply, socket}
      end
    else
      {:noreply, put_flash(socket, :error, "No active list found.")}
    end
  end

  def handle_event("load_list", %{"list_id" => list_id}, socket) do
    user_id = socket.assigns.current_scope.user.id

    case GroceryLists.set_active_list(list_id, user_id) do
      {:ok, _} ->
        # Reload data
        grocery_lists = GroceryLists.list_grocery_lists(user_id)
        active_list = GroceryLists.get_active_list(user_id)

        # Create new changesets for the forms
        item_changeset = GroceryLists.change_grocery_item(%GroceryLists.GroceryItem{})
        list_changeset = GroceryLists.change_grocery_list(active_list)

        socket =
          assign(socket,
            grocery_lists: grocery_lists,
            current_list: active_list,
            item_changeset: item_changeset,
            item_form: to_form(item_changeset),
            item_submitted: false,
            list_changeset: list_changeset,
            list_form: to_form(list_changeset),
            list_submitted: false,
            show_delete_confirm: false,
            list_to_delete: nil
          )

        {:noreply, socket}

      {:error, _} ->
        {:noreply, put_flash(socket, :error, "Failed to load list.")}
    end
  end

  def handle_event("confirm_delete_list", %{"list_id" => list_id}, socket) do
    # Show confirmation dialog
    socket =
      assign(socket,
        show_delete_confirm: true,
        list_to_delete: list_id
      )

    {:noreply, socket}
  end

  def handle_event("delete_list", %{"list_id" => list_id}, socket) do
    user_id = socket.assigns.current_scope.user.id

    case GroceryLists.get_grocery_list!(list_id, user_id) do
      list ->
        case GroceryLists.delete_grocery_list(list) do
          {:ok, _} ->
            # If we deleted the current list, get a new active list
            current_list =
              if socket.assigns.current_list && socket.assigns.current_list.id == String.to_integer(list_id) do
                case GroceryLists.get_or_create_active_list(user_id) do
                  {:ok, new_list} ->
                    # Ensure the new list is loaded with items
                    GroceryLists.get_grocery_list!(new_list.id, user_id)
                  {:error, _} -> nil
                end
              else
                socket.assigns.current_list
              end

            # Reload grocery lists to reflect the updated is_active status
            grocery_lists = GroceryLists.list_grocery_lists(user_id)

            # Create new changesets for the forms
            item_changeset = GroceryLists.change_grocery_item(%GroceryLists.GroceryItem{})
            list_changeset =
              if current_list,
                do: GroceryLists.change_grocery_list(current_list),
                else: GroceryLists.change_grocery_list(%GroceryLists.GroceryList{})

            socket =
              assign(socket,
                grocery_lists: grocery_lists,
                current_list: current_list,
                item_changeset: item_changeset,
                item_form: to_form(item_changeset),
                item_submitted: false,
                list_changeset: list_changeset,
                list_form: to_form(list_changeset),
                list_submitted: false,
                show_delete_confirm: false,
                list_to_delete: nil
              )

            {:noreply, socket |> put_flash(:info, "List deleted successfully!")}

          {:error, _} ->
            {:noreply, put_flash(socket, :error, "Failed to delete list.")}
        end
    end
  end

  def handle_event("cancel_delete", _params, socket) do
    # Hide confirmation dialog
    socket =
      assign(socket,
        show_delete_confirm: false,
        list_to_delete: nil
      )

    {:noreply, socket}
  end

  def handle_event("uncheck_all", _params, socket) do
    user_id = socket.assigns.current_scope.user.id
    current_list = socket.assigns.current_list

    if current_list do
      case GroceryLists.uncheck_all_items(current_list.id) do
        {_count, _} ->
          # Reload the current list with items
          updated_list = GroceryLists.get_grocery_list!(current_list.id, user_id)
          grocery_lists = GroceryLists.list_grocery_lists(user_id)

          socket =
            socket
            |> assign(:current_list, updated_list)
            |> assign(:grocery_lists, grocery_lists)

          {:noreply, socket}

        _ ->
          {:noreply, put_flash(socket, :error, "Failed to uncheck items.")}
      end
    else
      {:noreply, put_flash(socket, :error, "No active list found.")}
    end
  end

  def handle_event("new_list", _params, socket) do
    user_id = socket.assigns.current_scope.user.id

    case GroceryLists.create_grocery_list(%{
           name: "Shopping List",
           user_id: user_id
         }) do
      {:ok, new_list} ->
        # Set the new list as active
        GroceryLists.set_active_list(new_list.id, user_id)

        # Reload data
        grocery_lists = GroceryLists.list_grocery_lists(user_id)
        active_list = GroceryLists.get_active_list(user_id)

        # Create new changesets for the forms
        item_changeset = GroceryLists.change_grocery_item(%GroceryLists.GroceryItem{})
        list_changeset = GroceryLists.change_grocery_list(active_list)

        socket =
          assign(socket,
            grocery_lists: grocery_lists,
            current_list: active_list,
            item_changeset: item_changeset,
            item_form: to_form(item_changeset),
            item_submitted: false,
            list_changeset: list_changeset,
            list_form: to_form(list_changeset),
            list_submitted: false,
            show_delete_confirm: false,
            list_to_delete: nil
          )

        {:noreply, socket |> put_flash(:info, "New list created successfully!")}

      {:error, _changeset} ->
        {:noreply, put_flash(socket, :error, "Failed to create new list.")}
    end
  end

  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-base-100 flex flex-col">
      <.navigation current_scope={@current_scope} current_path={@current_path} maintenance_status={@maintenance_status} user_agent={@user_agent} />

      <div class="flex flex-1">
        <.sidebar current_path={@current_path} />

        <div class="flex-1">
          <main class="px-4 py-8 md:py-12" phx-hook="TimezoneData" id="groceries-page">
            <div class="max-w-7xl mx-auto space-y-8">
              <.header centered={true} actions_right={true}>
                Groceries
                <:subtitle>Manage your grocery lists</:subtitle>
                <:actions>
                  <div class="hidden md:flex items-center gap-2">
                    <button class="btn btn-sm btn-info" phx-click="new_list" phx-value-date={@max_date}>New List</button>
                  </div>
                </:actions>
              </.header>
              <!-- Mobile Date Picker -->
              <div class="md:hidden mt-4">
                <div class="flex items-center gap-2 justify-center">
                  <button class="btn btn-sm btn-info" phx-click="new_list" phx-value-date={@max_date}>New List</button>
                </div>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                <!-- Grocery Lists Panel -->
                <div class="lg:col-span-1">
                  <div class="card bg-base-200 shadow-sm">
                    <div class="card-body">
                      <h3 class="card-title">Your Lists</h3>

                      <div class="space-y-2">
                        <%= if Enum.empty?(@grocery_lists) do %>
                          <div class="p-4 border border-base-300 rounded-lg">
                            <p class="text-sm text-base-content/70">No saved lists yet</p>
                            <p class="text-xs text-base-content/50 mt-1">Create your first grocery list to get started</p>
                          </div>
                        <% else %>
                          <%= for list <- @grocery_lists do %>
                            <div class={[
                              "p-3 border rounded-lg cursor-pointer transition-colors",
                              if(list.is_active, do: "border-primary bg-primary/10", else: "border-base-300 hover:border-base-content/30")
                            ]} phx-click="load_list" phx-value-list_id={list.id}>
                              <div class="flex justify-between items-center">
                                <div class="flex-1">
                                  <h4 class="font-medium text-sm">{list.name}</h4>
                                  <p class="text-xs text-base-content/60">
                                    {if list.items, do: length(list.items), else: 0} items
                                    <%= if list.is_active do %>
                                      • Active
                                    <% end %>
                                  </p>
                                </div>
                                <button
                                  class="btn btn-sm btn-ghost btn-square"
                                  phx-click="confirm_delete_list"
                                  phx-value-list_id={list.id}
                                  phx-stop-propagation="true"
                                >
                                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          <% end %>
                        <% end %>
                        <div class="hidden md:block text-center py-8">
                          <img src="https://cdn.nobull.fit/shopping.png" alt="NoBullFit" class="w-45 h-auto mx-auto" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Current List Panel -->
                <div class="lg:col-span-2">
                  <div class="card bg-base-200 shadow-sm">
                    <div class="card-body">
                      <div class="flex justify-between items-center mb-4">
                        <h3 class="card-title">Current List</h3>
                        <div class="flex gap-2">
                          <%= if @current_list do %>
                            <button
                              class="btn btn-sm btn-error"
                              phx-click="confirm_delete_list"
                              phx-value-list_id={@current_list.id}
                            >
                              Delete
                            </button>
                          <% end %>
                        </div>
                      </div>

                      <!-- List Name Input and Save Form -->
                      <%= if @current_list do %>
                        <.form for={@list_form} phx-submit="save_list" class="form-control mb-4" novalidate>
                          <fieldset>
                            <legend class="fieldset-legend">List Name</legend>
                            <div class="flex gap-2">
                              <.input
                                field={@list_form[:name]}
                                type="text"
                                placeholder="Enter list name"
                                class={if @list_submitted && @list_changeset.errors[:name], do: "input input-bordered input-error flex-1", else: "input input-bordered flex-1"}
                                no_wrapper={true}
                              />
                              <button type="submit" class="btn btn-primary">
                                Save List
                              </button>
                            </div>
                          </fieldset>
                        </.form>
                      <% end %>

                      <!-- Add Item Form -->
                      <.form for={@item_form} phx-submit="add_item" class="form-control mb-6" novalidate phx-hook="GroceryItemForm" id="add-item-form">
                        <div class="flex gap-2">
                          <div class="flex-1">
                            <.input
                              field={@item_form[:name]}
                              type="text"
                              placeholder="Item name"
                              class={if @item_submitted && @item_changeset.errors[:name], do: "input input-bordered input-error w-full", else: "input input-bordered w-full"}
                              no_wrapper={true}
                              required
                            />
                          </div>
                          <div class="w-24">
                            <.input
                              field={@item_form[:quantity]}
                              type="text"
                              placeholder="Qty (optional)"
                              class={if @item_submitted && @item_changeset.errors[:quantity], do: "input input-bordered input-error w-full", else: "input input-bordered w-full"}
                              no_wrapper={true}
                            />
                          </div>
                          <button type="submit" class="btn btn-primary">
                            Add
                          </button>
                        </div>
                      </.form>

                      <!-- Items List -->
                      <div class="space-y-2">
                        <%= if @current_list && @current_list.items && Enum.empty?(@current_list.items) do %>
                          <div class="p-4 border border-base-300 rounded-lg">
                            <p class="text-sm text-base-content/70">No items in list</p>
                            <p class="text-xs text-base-content/50 mt-1">Add items above to build your grocery list</p>
                          </div>
                        <% else %>
                          <%= if @current_list && @current_list.items do %>
                            <%= for item <- @current_list.items do %>
                              <div class={[
                                "p-3 border rounded-lg flex items-center justify-between",
                                if(item.is_completed, do: "border-success bg-success/10", else: "border-base-300")
                              ]}>
                                <div class="flex items-center gap-3 flex-1">
                                  <button
                                    class={[
                                      "btn btn-sm btn-square",
                                      if(item.is_completed, do: "btn-success", else: "btn-ghost")
                                    ]}
                                    phx-click="toggle_item"
                                    phx-value-item_id={item.id}
                                  >
                                    <%= if item.is_completed do %>
                                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                      </svg>
                                    <% else %>
                                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                      </svg>
                                    <% end %>
                                  </button>
                                  <div class="flex-1">
                                    <p class={[
                                      "text-sm font-medium",
                                      if(item.is_completed, do: "line-through text-base-content/50", else: "text-base-content")
                                    ]}>
                                      {item.name}
                                    </p>
                                    <%= if item.quantity && String.trim(item.quantity) != "" do %>
                                      <p class="text-xs text-base-content/60">Qty: {item.quantity}</p>
                                    <% end %>
                                  </div>
                                </div>
                                <button
                                  class="btn btn-sm btn-ghost btn-square"
                                  phx-click="remove_item"
                                  phx-value-item_id={item.id}
                                >
                                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                  </svg>
                                </button>
                              </div>
                            <% end %>

                            <!-- Uncheck All Button -->
                            <div class="flex justify-start mt-4">
                              <button
                                class="btn btn-sm btn-ghost"
                                phx-click="uncheck_all"
                              >
                                Uncheck All
                              </button>
                            </div>
                          <% end %>
                        <% end %>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Delete Confirmation Modal -->
            <%= if @show_delete_confirm do %>
              <div class="modal modal-open">
                <div class="modal-box">
                  <h3 class="font-bold text-lg">Confirm Delete</h3>
                  <p class="py-4">Are you sure you want to delete this list? This action cannot be undone.</p>
                  <div class="modal-action">
                    <button class="btn btn-ghost" phx-click="cancel_delete">Cancel</button>
                    <button class="btn btn-error" phx-click="delete_list" phx-value-list_id={@list_to_delete}>Delete</button>
                  </div>
                </div>
              </div>
            <% end %>
          </main>
        </div>
      </div>

      <.footer current_path={@current_path} />
      <.flash_group flash={@flash} />
    </div>
    """
  end
end
