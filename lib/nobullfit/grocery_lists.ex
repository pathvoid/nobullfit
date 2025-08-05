defmodule Nobullfit.GroceryLists do
  @moduledoc """
  The GroceryLists context.
  """

  import Ecto.Query, warn: false
  alias Nobullfit.Repo
  alias Nobullfit.GroceryLists.{GroceryList, GroceryItem}

  @doc """
  Returns the list of grocery lists for a user.
  """
  def list_grocery_lists(user_id) do
    GroceryList
    |> where([list], list.user_id == ^user_id)
    |> order_by([list], [desc: list.updated_at])
    |> preload(:items)
    |> Repo.all()
  end

  @doc """
  Gets a single grocery list by ID for a specific user.
  """
  def get_grocery_list!(id, user_id) do
    GroceryList
    |> where([list], list.id == ^id and list.user_id == ^user_id)
    |> preload(:items)
    |> Repo.one!()
  end

  @doc """
  Creates a grocery list.
  """
  def create_grocery_list(attrs \\ %{}) do
    %GroceryList{}
    |> GroceryList.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a grocery list.
  """
  def update_grocery_list(%GroceryList{} = grocery_list, attrs) do
    grocery_list
    |> GroceryList.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a grocery list.
  """
  def delete_grocery_list(%GroceryList{} = grocery_list) do
    Repo.delete(grocery_list)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking grocery list changes.
  """
  def change_grocery_list(%GroceryList{} = grocery_list, attrs \\ %{}) do
    GroceryList.changeset(grocery_list, attrs)
  end

  @doc """
  Gets the active grocery list for a user, or creates a new one.
  """
    def get_or_create_active_list(user_id) do
    case get_active_list(user_id) do
      nil ->
        # Check if there are any existing lists for this user
        existing_lists = list_grocery_lists(user_id)

        case existing_lists do
          [] ->
            # No lists exist, create a new one
            create_grocery_list(%{
              name: "Shopping List",
              user_id: user_id
            })

          [first_list | _] ->
            # There are existing lists, make the first one active
            case set_active_list(first_list.id, user_id) do
              {:ok, _} ->
                {:ok, get_grocery_list!(first_list.id, user_id)}
              {:error, _error} ->
                {:error, "Failed to set active list"}
            end
        end

      list ->
        {:ok, list}
    end
  end

  @doc """
  Gets the active grocery list for a user.
  """
  def get_active_list(user_id) do
    GroceryList
    |> where([list], list.user_id == ^user_id and list.is_active == true)
    |> preload(:items)
    |> Repo.one()
  end

  @doc """
  Sets a grocery list as active and deactivates others for the user.
  """
  def set_active_list(list_id, user_id) do
    Repo.transaction(fn ->
      # Deactivate all other lists for this user
      {_deactivated_count, _} = GroceryList
      |> where([list], list.user_id == ^user_id)
      |> Repo.update_all(set: [is_active: false])

      # Activate the specified list
      {activated_count, _} = GroceryList
      |> where([list], list.id == ^list_id and list.user_id == ^user_id)
      |> Repo.update_all(set: [is_active: true])

      activated_count
    end)
  end

  @doc """
  Adds an item to a grocery list.
  """
  def add_item_to_list(list_id, item_attrs) do
    # Get the current max sort_order for this list
    max_order =
      GroceryItem
      |> where([item], item.grocery_list_id == ^list_id)
      |> select([item], fragment("COALESCE(MAX(?), 0)", item.sort_order))
      |> Repo.one()

    # Ensure all keys are strings to avoid mixed key types
    item_attrs =
      item_attrs
      |> Map.put("sort_order", (max_order || 0) + 1)

    %GroceryItem{}
    |> GroceryItem.changeset(item_attrs)
    |> Repo.insert()
  end

  @doc """
  Removes an item from a grocery list.
  """
  def remove_item_from_list(item_id, list_id) do
    GroceryItem
    |> where([item], item.id == ^item_id and item.grocery_list_id == ^list_id)
    |> Repo.delete_all()
  end

  @doc """
  Toggles the completed status of an item.
  """
  def toggle_item_completed(item_id, list_id) do
    item = Repo.get_by(GroceryItem, id: item_id, grocery_list_id: list_id)

    if item do
      GroceryItem
      |> where([item], item.id == ^item_id and item.grocery_list_id == ^list_id)
      |> Repo.update_all(set: [is_completed: !item.is_completed])
    end
  end

  @doc """
  Updates an item's sort order.
  """
  def update_item_sort_order(item_id, list_id, new_order) do
    GroceryItem
    |> where([item], item.id == ^item_id and item.grocery_list_id == ^list_id)
    |> Repo.update_all(set: [sort_order: new_order])
  end

  @doc """
  Gets all items for a grocery list, ordered by sort_order.
  """
  def get_list_items(list_id) do
    GroceryItem
    |> where([item], item.grocery_list_id == ^list_id)
    |> order_by([item], item.sort_order)
    |> Repo.all()
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking grocery item changes.
  """
  def change_grocery_item(%GroceryItem{} = grocery_item, attrs \\ %{}) do
    GroceryItem.changeset(grocery_item, attrs)
  end
end
