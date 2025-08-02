defmodule Nobullfit.WeightEntries.WeightEntry do
  use Ecto.Schema
  import Ecto.Changeset

  schema "weight_entries" do
    field :weight, :decimal
    field :unit, :string
    field :entry_date, :date

    belongs_to :user, Nobullfit.Accounts.User

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(weight_entry, attrs) do
    weight_entry
    |> cast(attrs, [:weight, :unit, :entry_date, :user_id])
    |> validate_required([:weight, :unit, :entry_date, :user_id])
    |> validate_inclusion(:unit, ["kg", "lbs"])
    |> validate_number(:weight, greater_than: 0, less_than_or_equal_to: 1000)
    |> validate_date_not_in_future()
    |> foreign_key_constraint(:user_id)
  end

  # Convert weight to kg for consistent calculations
  def to_kg(weight, unit) when unit == "kg" do
    weight
  end

  def to_kg(weight, unit) when unit == "lbs" do
    Decimal.mult(weight, Decimal.new("0.453592"))
  end

  # Convert weight from kg to target unit
  def from_kg(weight_kg, unit) when unit == "kg" do
    weight_kg
  end

  def from_kg(weight_kg, unit) when unit == "lbs" do
    Decimal.div(weight_kg, Decimal.new("0.453592"))
  end

  # Calculate weight difference between two entries
  def weight_difference(current_entry, previous_entry) do
    current_kg = to_kg(current_entry.weight, current_entry.unit)
    previous_kg = to_kg(previous_entry.weight, previous_entry.unit)

    difference_kg = Decimal.sub(current_kg, previous_kg)

    # Return difference in the current entry's unit
    from_kg(difference_kg, current_entry.unit)
  end

  # Format weight with unit
  def format_weight(weight, unit) do
    "#{Decimal.round(weight, 1)} #{unit}"
  end

  # Format weight difference with sign
  def format_difference(difference, unit) do
    sign = if Decimal.gt?(difference, Decimal.new("0")), do: "+", else: ""
    "#{sign}#{Decimal.round(difference, 1)} #{unit}"
  end

  defp validate_date_not_in_future(changeset) do
    validate_change(changeset, :entry_date, fn :entry_date, entry_date ->
      if Date.compare(entry_date, Date.utc_today()) == :gt do
        [entry_date: "cannot be in the future"]
      else
        []
      end
    end)
  end
end
