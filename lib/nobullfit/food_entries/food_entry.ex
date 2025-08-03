defmodule Nobullfit.FoodEntries.FoodEntry do
  use Ecto.Schema
  import Ecto.Changeset

  schema "food_entries" do
    field :entry_date, :date
    field :name, :string
    field :meal_type, :string
    field :calories, :decimal
    field :protein, :decimal
    field :carbs, :decimal

    belongs_to :user, Nobullfit.Accounts.User

    timestamps()
  end

  @doc false
  def changeset(food_entry, attrs) do
    food_entry
    |> cast(attrs, [:user_id, :entry_date, :name, :meal_type, :calories, :protein, :carbs])
    |> validate_required([:user_id, :entry_date, :name, :meal_type, :calories])
    |> validate_number(:calories, greater_than: 0)
    |> validate_number(:protein, greater_than_or_equal_to: 0)
    |> validate_number(:carbs, greater_than_or_equal_to: 0)
    |> validate_inclusion(:meal_type, ["breakfast", "lunch", "dinner", "snack"])
    |> foreign_key_constraint(:user_id)
  end

  def format_calories(calories) do
    case calories do
      %Decimal{} -> Decimal.round(calories, 1) |> Decimal.to_string()
      _ -> "0"
    end
  end

  def format_protein(protein) do
    case protein do
      %Decimal{} -> "#{Decimal.round(protein, 1) |> Decimal.to_string()}g"
      _ -> "0g"
    end
  end

  def format_carbs(carbs) do
    case carbs do
      %Decimal{} -> "#{Decimal.round(carbs, 1) |> Decimal.to_string()}g"
      _ -> "0g"
    end
  end
end
