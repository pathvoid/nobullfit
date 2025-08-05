defmodule Nobullfit.GroceryLists.GroceryList do
  use Ecto.Schema
  import Ecto.Changeset

  alias Nobullfit.GroceryLists.GroceryItem

  schema "grocery_lists" do
    field :name, :string
    field :description, :string
    field :is_active, :boolean, default: true

    belongs_to :user, Nobullfit.Accounts.User
    has_many :items, GroceryItem, on_replace: :delete

    timestamps()
  end

  @doc false
  def changeset(grocery_list, attrs) do
    grocery_list
    |> cast(attrs, [:name, :description, :is_active, :user_id])
    |> validate_required([:name, :user_id])
    |> validate_length(:name, min: 1, max: 100)
    |> validate_length(:description, max: 500)
    |> foreign_key_constraint(:user_id)
  end

  def changeset_with_items(grocery_list, attrs) do
    grocery_list
    |> changeset(attrs)
    |> cast_assoc(:items, with: &GroceryItem.changeset/2)
  end
end
