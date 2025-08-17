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
    |> preload(items: ^from(item in GroceryItem, order_by: [asc: item.name]))
    |> Repo.all()
  end

  @doc """
  Gets a single grocery list by ID for a specific user.
  """
  def get_grocery_list!(id, user_id) do
    GroceryList
    |> where([list], list.id == ^id and list.user_id == ^user_id)
    |> preload(items: ^from(item in GroceryItem, order_by: [asc: item.name]))
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
    |> preload(items: ^from(item in GroceryItem, order_by: [asc: item.name]))
    |> Repo.one()
  end

  @doc """
  Sets a grocery list as active and deactivates others for the user.
  """
  def set_active_list(list_id, user_id) do
    Repo.transaction(fn ->
      # Deactivate all other lists for this user
      {_deactivated_count, _} =
        GroceryList
        |> where([list], list.user_id == ^user_id)
        |> Repo.update_all(set: [is_active: false])

      # Activate the specified list
      {activated_count, _} =
        GroceryList
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
  Adds recipe ingredients to a grocery list, checking for existing items and combining quantities.
  """
  def add_recipe_ingredients_to_list(list_id, ingredients) do
    Repo.transaction(fn ->
      Enum.map(ingredients, fn ingredient ->
        # Check if items already exist in the list (case-insensitive)
        existing_items =
          Repo.all(
            from item in GroceryItem,
              where:
                item.grocery_list_id == ^list_id and
                  fragment("LOWER(?)", item.name) == ^String.downcase(ingredient["food"])
          )

        if length(existing_items) > 0 do
          # Find the best matching item based on units
          best_match = find_best_matching_item(existing_items, ingredient["quantity"], ingredient["measure"])

          case best_match do
            {:match, item} ->
              # Found a matching item, but first combine all items with the same units
              new_measure = ingredient["measure"]

              # Find all items with the same units
              same_unit_items = Enum.filter(existing_items, fn other_item ->
                case parse_quantity(other_item.quantity) do
                  {_amount, unit} when unit == new_measure -> true
                  _ -> false
                end
              end)

              # Combine all quantities with the same units
              combined_quantity = Enum.reduce(same_unit_items, "", fn other_item, acc ->
                if acc == "" do
                  other_item.quantity
                else
                  combine_quantities(acc, parse_quantity(other_item.quantity) |> elem(0), new_measure)
                end
              end)

              # Add the new ingredient quantity
              final_quantity = combine_quantities(combined_quantity, ingredient["quantity"], ingredient["measure"])

              # Update the first item with combined quantity
              updated_item =
                item
                |> GroceryItem.changeset(%{quantity: final_quantity})
                |> Repo.update()

              # Delete all other items with the same units
              Enum.each(same_unit_items -- [item], fn other_item ->
                Repo.delete(other_item)
              end)

              updated_item

            {:combine, _items} ->
              # No matching units found, create a new separate item
              # Get the current max sort_order for this list
              max_order =
                GroceryItem
                |> where([item], item.grocery_list_id == ^list_id)
                |> select([item], fragment("COALESCE(MAX(?), 0)", item.sort_order))
                |> Repo.one()

              # Create new item with different units
              quantity_str =
                if ingredient["quantity"] == 0.0 or ingredient["quantity"] == 0 do
                  "As needed"
                else
                  if ingredient["measure"] == "<unit>" do
                    # Just show the quantity without the generic "<unit>" text
                    if is_float(ingredient["quantity"]) and ingredient["quantity"] == trunc(ingredient["quantity"]) do
                      "#{trunc(ingredient["quantity"])}"
                    else
                      "#{ingredient["quantity"]}"
                    end
                  else
                    if is_float(ingredient["quantity"]) and ingredient["quantity"] == trunc(ingredient["quantity"]) do
                      "#{trunc(ingredient["quantity"])} #{ingredient["measure"]}"
                    else
                      "#{ingredient["quantity"]} #{ingredient["measure"]}"
                    end
                  end
                end

              %GroceryItem{}
              |> GroceryItem.changeset(%{
                "grocery_list_id" => list_id,
                "name" => String.capitalize(ingredient["food"]),
                "quantity" => quantity_str,
                "sort_order" => (max_order || 0) + 1
              })
              |> Repo.insert()
          end
        else
          # Get the current max sort_order for this list
          max_order =
            GroceryItem
            |> where([item], item.grocery_list_id == ^list_id)
            |> select([item], fragment("COALESCE(MAX(?), 0)", item.sort_order))
            |> Repo.one()

          # Create new item directly within transaction
          quantity_str =
            if ingredient["quantity"] == 0.0 or ingredient["quantity"] == 0 do
              "As needed"
            else
              if ingredient["measure"] == "<unit>" do
                # Just show the quantity without the generic "<unit>" text
                if is_float(ingredient["quantity"]) and ingredient["quantity"] == trunc(ingredient["quantity"]) do
                  "#{trunc(ingredient["quantity"])}"
                else
                  "#{ingredient["quantity"]}"
                end
              else
                if is_float(ingredient["quantity"]) and ingredient["quantity"] == trunc(ingredient["quantity"]) do
                  "#{trunc(ingredient["quantity"])} #{ingredient["measure"]}"
                else
                  "#{ingredient["quantity"]} #{ingredient["measure"]}"
                end
              end
            end

          %GroceryItem{}
          |> GroceryItem.changeset(%{
            "grocery_list_id" => list_id,
            "name" => String.capitalize(ingredient["food"]),
            "quantity" => quantity_str,
            "sort_order" => (max_order || 0) + 1
          })
          |> Repo.insert()
        end
      end)
    end)
  end

  # Helper function to find the best matching item based on units
  defp find_best_matching_item(existing_items, new_quantity, new_measure) do
    # Handle "As needed" quantities specially
    if new_quantity == 0.0 or new_quantity == 0 do
      # Look for existing "As needed" items
      as_needed_item = Enum.find(existing_items, fn item ->
        item.quantity == "As needed"
      end)

      if as_needed_item do
        {:match, as_needed_item}
      else
        {:combine, existing_items}
      end
    else
      # Try to find an item with matching units
      matching_item = Enum.find(existing_items, fn item ->
        case parse_quantity(item.quantity) do
          {_amount, unit} when unit == new_measure -> true
          _ -> false
        end
      end)

      if matching_item do
        {:match, matching_item}
      else
        # No matching units found, combine all items
        {:combine, existing_items}
      end
    end
  end

  # Helper function to combine quantities
  defp combine_quantities(existing_quantity, new_quantity, new_measure) do
    # Handle zero quantities - don't add them
    if new_quantity == 0.0 or new_quantity == 0 do
      # If existing is already "As needed", keep it
      if existing_quantity == "As needed" do
        existing_quantity
      else
        "As needed"
      end
    else
      # Handle "<unit>" measure specially
      if new_measure == "<unit>" do
        case parse_quantity(existing_quantity) do
          {existing_amount, existing_unit} when existing_unit == "<unit>" ->
            # Both are "<unit>", add numerically
            total_amount = existing_amount + new_quantity
            format_number(total_amount)

          {_existing_amount, _existing_unit} ->
            # Units don't match, just append
            new_quantity_str = format_number(new_quantity)

            if existing_quantity && existing_quantity != "" do
              "#{existing_quantity} + #{new_quantity_str}"
            else
              new_quantity_str
            end

          nil ->
            # Can't parse existing quantity, just append
            new_quantity_str = format_number(new_quantity)

            if existing_quantity && existing_quantity != "" do
              "#{existing_quantity} + #{new_quantity_str}"
            else
              new_quantity_str
            end
        end
      else
        # Try to parse existing quantity and add numerically if units match
        case parse_quantity(existing_quantity) do
          {existing_amount, existing_unit} when existing_unit == new_measure ->
            # Units match, add numerically
            total_amount = existing_amount + new_quantity
            format_quantity(total_amount, new_measure)

          {_existing_amount, _existing_unit} ->
            # Units don't match, just append
            new_quantity_str = format_number(new_quantity)
            new_quantity_with_measure = "#{new_quantity_str} #{new_measure}"

            if existing_quantity && existing_quantity != "" do
              "#{existing_quantity} + #{new_quantity_with_measure}"
            else
              new_quantity_with_measure
            end

          nil ->
            # Can't parse existing quantity, just append
            new_quantity_str = format_number(new_quantity)
            new_quantity_with_measure = "#{new_quantity_str} #{new_measure}"

            if existing_quantity && existing_quantity != "" do
              "#{existing_quantity} + #{new_quantity_with_measure}"
            else
              new_quantity_with_measure
            end
        end
      end
    end
  end

  # Helper function to parse quantity strings like "2 cups", "1.5 tablespoon", etc.
  defp parse_quantity(quantity_str) when is_binary(quantity_str) do
    # Handle "As needed" case
    if quantity_str == "As needed" do
      nil
    else
      # Handle "<unit>" case - just extract the number
      if String.contains?(quantity_str, "<unit>") do
        case Regex.run(~r/^(\d+(?:\.\d+)?)\s*<unit>/, quantity_str) do
          [_, amount_str] ->
            case Float.parse(amount_str) do
              {amount, _} -> {amount, "<unit>"}
              :error -> nil
            end

          nil ->
            nil
        end
      else
        # Check if it's just a plain number (no unit) - treat as "<unit>"
        case Regex.run(~r/^(\d+(?:\.\d+)?)$/, quantity_str) do
          [_, amount_str] ->
            case Float.parse(amount_str) do
              {amount, _} -> {amount, "<unit>"}
              :error -> nil
            end

          nil ->
            # Try to extract number and unit from strings like "2 cups", "1.5 tablespoon", "2 cups + 1 cup"
            case Regex.run(~r/^(\d+(?:\.\d+)?)\s+(.+)$/, quantity_str) do
              [_, amount_str, unit] ->
                case Float.parse(amount_str) do
                  {amount, _} -> {amount, unit}
                  :error -> nil
                end

              nil ->
                nil
            end
        end
      end
    end
  end

  defp parse_quantity(_), do: nil

  # Helper function to format numbers (remove .0 for whole numbers)
  defp format_number(number) when is_float(number) and number == trunc(number) do
    "#{trunc(number)}"
  end

  defp format_number(number) do
    "#{number}"
  end

  # Helper function to format quantity with unit
  defp format_quantity(amount, unit) do
    "#{format_number(amount)} #{unit}"
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
  Unchecks all items in a grocery list.
  """
  def uncheck_all_items(list_id) do
    GroceryItem
    |> where([item], item.grocery_list_id == ^list_id)
    |> Repo.update_all(set: [is_completed: false])
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
  Gets all items for a grocery list, ordered alphabetically by name.
  """
  def get_list_items(list_id) do
    GroceryItem
    |> where([item], item.grocery_list_id == ^list_id)
    |> order_by([item], [asc: item.name])
    |> Repo.all()
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking grocery item changes.
  """
  def change_grocery_item(%GroceryItem{} = grocery_item, attrs \\ %{}) do
    GroceryItem.changeset(grocery_item, attrs)
  end
end
