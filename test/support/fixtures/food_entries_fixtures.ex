defmodule Nobullfit.FoodEntriesFixtures do
  @moduledoc """
  This module defines test fixtures for the FoodEntries context.
  """

  alias Nobullfit.FoodEntries

  @doc """
  Generate a food_entry.
  """
  def food_entry_fixture(user, attrs \\ %{}) do
    today = Date.utc_today()

    default_attrs = %{
      user_id: user.id,
      entry_date: today,
      name: "Test Food",
      meal_type: "breakfast",
      calories: Decimal.new("100"),
      protein: Decimal.new("10"),
      carbs: Decimal.new("5")
    }

    attrs = Enum.into(attrs, default_attrs)

    {:ok, food_entry} = FoodEntries.create_food_entry(attrs)
    food_entry
  end

  @doc """
  Generate a list of food entries for a user.
  """
  def food_entries_fixture(user, count \\ 3) do
    today = Date.utc_today()

    for i <- 1..count do
      food_entry_fixture(user, %{
        name: "Test Food #{i}",
        meal_type: ["breakfast", "lunch", "dinner", "snack"] |> Enum.at(rem(i - 1, 4)),
        calories: Decimal.new("#{100 + i * 10}"),
        protein: Decimal.new("#{10 + i}"),
        carbs: Decimal.new("#{5 + i}"),
        entry_date: Date.add(today, -i)
      })
    end
  end

  @doc """
  Generate a food entry with specific meal type.
  """
  def food_entry_with_meal_type_fixture(user, meal_type, attrs \\ %{}) do
    food_entry_fixture(user, Map.merge(attrs, %{meal_type: meal_type}))
  end

  @doc """
  Generate a food entry for a specific date.
  """
  def food_entry_for_date_fixture(user, date, attrs \\ %{}) do
    food_entry_fixture(user, Map.merge(attrs, %{entry_date: date}))
  end

  @doc """
  Generate a food entry with high calories.
  """
  def high_calorie_food_entry_fixture(user, attrs \\ %{}) do
    food_entry_fixture(user, Map.merge(attrs, %{
      name: "High Calorie Food",
      calories: Decimal.new("500"),
      protein: Decimal.new("25"),
      carbs: Decimal.new("50")
    }))
  end

  @doc """
  Generate a food entry with low calories.
  """
  def low_calorie_food_entry_fixture(user, attrs \\ %{}) do
    food_entry_fixture(user, Map.merge(attrs, %{
      name: "Low Calorie Food",
      calories: Decimal.new("50"),
      protein: Decimal.new("5"),
      carbs: Decimal.new("2")
    }))
  end
end
