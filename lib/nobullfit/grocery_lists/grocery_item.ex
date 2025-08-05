defmodule Nobullfit.GroceryLists.GroceryItem do
  use Ecto.Schema
  import Ecto.Changeset

  alias Nobullfit.GroceryLists.GroceryList

  schema "grocery_items" do
    field :name, :string
    field :quantity, :string
    field :is_completed, :boolean, default: false
    field :sort_order, :integer, default: 0

    belongs_to :grocery_list, GroceryList

    timestamps()
  end

  @doc false
  def changeset(grocery_item, attrs) do
    grocery_item
    |> cast(attrs, [:name, :quantity, :is_completed, :sort_order, :grocery_list_id])
    |> validate_required([:name, :grocery_list_id])
    |> validate_length(:name, min: 1, max: 100)
    |> validate_length(:quantity, max: 20)
    |> foreign_key_constraint(:grocery_list_id)
  end
end
