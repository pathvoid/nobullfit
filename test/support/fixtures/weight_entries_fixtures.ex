defmodule Nobullfit.WeightEntriesFixtures do
  @moduledoc """
  This module defines test fixtures for the WeightEntries context.
  """
  alias Nobullfit.WeightEntries

  @doc """
  Generate a weight_entry.
  """
  def weight_entry_fixture(user, attrs \\ %{}) do
    {:ok, weight_entry} =
      attrs
      |> Enum.into(%{
        weight: Decimal.new("75.5"),
        unit: "kg",
        entry_date: Date.utc_today(),
        user_id: user.id
      })
      |> WeightEntries.create_weight_entry()

    weight_entry
  end
end
