defmodule Nobullfit.GroceryListsFixtures do
  @moduledoc """
  This module defines test fixtures for the GroceryLists context.
  """
  alias Nobullfit.GroceryLists

  @doc """
  Generate a grocery_list.
  """
  def grocery_list_fixture(user, attrs \\ %{}) do
    # If we're creating an active list, first deactivate any existing active lists
    if Map.get(attrs, :is_active, true) do
      GroceryLists.list_grocery_lists(user.id)
      |> Enum.filter(& &1.is_active)
      |> Enum.each(fn list ->
        GroceryLists.update_grocery_list(list, %{is_active: false})
      end)
    end

    {:ok, grocery_list} =
      attrs
      |> Enum.into(%{
        name: "Test Grocery List #{System.unique_integer()}",
        description: "A test grocery list",
        is_active: true,
        user_id: user.id
      })
      |> GroceryLists.create_grocery_list()

    grocery_list
  end

  @doc """
  Generate a grocery_item.
  """
  def grocery_item_fixture(grocery_list, attrs \\ %{}) do
    item_params =
      attrs
      |> Enum.into(%{
        "name" => "Test Item #{System.unique_integer()}",
        "quantity" => "1",
        "grocery_list_id" => grocery_list.id,
        "is_completed" => false
      })

    {:ok, grocery_item} = GroceryLists.add_item_to_list(grocery_list.id, item_params)
    grocery_item
  end
end
