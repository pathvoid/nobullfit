defmodule Nobullfit.FoodEntries do
  @moduledoc """
  The FoodEntries context.
  """

  import Ecto.Query, warn: false
  alias Nobullfit.Repo
  alias Nobullfit.FoodEntries.FoodEntry

  @doc """
  Returns the list of food_entries.

  ## Examples

      iex> list_food_entries()
      [%FoodEntry{}, ...]

  """
  def list_food_entries do
    Repo.all(FoodEntry)
  end

  @doc """
  Gets a single food_entry.

  Raises `Ecto.NoResultsError` if the Food Entry does not exist.

  ## Examples

      iex> get_food_entry!(123)
      %FoodEntry{}

      iex> get_food_entry!(456)
      ** (Ecto.NoResultsError)

  """
  def get_food_entry!(id), do: Repo.get!(FoodEntry, id)

  @doc """
  Creates a food_entry.

  ## Examples

      iex> create_food_entry(%{field: value})
      {:ok, %FoodEntry{}}

      iex> create_food_entry(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_food_entry(attrs \\ %{}) do
    %FoodEntry{}
    |> FoodEntry.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a food_entry.

  ## Examples

      iex> update_food_entry(food_entry, %{field: new_value})
      {:ok, %FoodEntry{}}

      iex> update_food_entry(food_entry, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_food_entry(%FoodEntry{} = food_entry, attrs) do
    food_entry
    |> FoodEntry.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a food_entry.

  ## Examples

      iex> delete_food_entry(food_entry)
      {:ok, %FoodEntry{}}

      iex> delete_food_entry(food_entry)
      {:error, %Ecto.Changeset{}}

  """
  def delete_food_entry(%FoodEntry{} = food_entry) do
    Repo.delete(food_entry)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking food_entry changes.

  ## Examples

      iex> change_food_entry(food_entry)
      %Ecto.Changeset{data: %FoodEntry{}}

  """
  def change_food_entry(%FoodEntry{} = food_entry, attrs \\ %{}) do
    FoodEntry.changeset(food_entry, attrs)
  end

  @doc """
  Gets food entries for a specific user and date.
  """
  def get_user_food_entries_for_date(user_id, date) do
    FoodEntry
    |> where([f], f.user_id == ^user_id and f.entry_date == ^date)
    |> order_by([f], [asc: f.meal_type, asc: f.inserted_at])
    |> Repo.all()
  end

  @doc """
  Gets food entries for a specific user, date, and meal type.
  """
  def get_user_food_entries_for_meal(user_id, date, meal_type) do
    FoodEntry
    |> where([f], f.user_id == ^user_id and f.entry_date == ^date and f.meal_type == ^meal_type)
    |> order_by([f], [asc: f.inserted_at])
    |> Repo.all()
  end

  @doc """
  Gets the daily nutrition summary for a user on a specific date.
  """
  def get_user_daily_nutrition_summary(user_id, date) do
    FoodEntry
    |> where([f], f.user_id == ^user_id and f.entry_date == ^date)
    |> select([f], %{
      total_calories: sum(f.calories),
      total_protein: sum(f.protein),
      total_carbs: sum(f.carbs),
      food_count: count(f.id)
    })
    |> Repo.one()
    |> case do
      nil ->
        %{
          total_calories: Decimal.new(0),
          total_protein: Decimal.new(0),
          total_carbs: Decimal.new(0),
          food_count: 0
        }

      result ->
        result
    end
  end

  @doc """
  Gets weekly nutrition summary for a user.
  """
  def get_user_weekly_nutrition_summary(user_id, start_date) do
    end_date = Date.add(start_date, 6)

    # Get daily summaries for each day of the week
    daily_summaries =
      for date <- Date.range(start_date, end_date) do
        summary = get_user_daily_nutrition_summary(user_id, date)

        %{
          date: date,
          calories: Decimal.round(summary.total_calories || Decimal.new("0"), 0),
          protein: Decimal.round(summary.total_protein || Decimal.new("0"), 1),
          carbs: Decimal.round(summary.total_carbs || Decimal.new("0"), 1),
          food_count: summary.food_count || 0
        }
      end

    %{
      start_date: start_date,
      end_date: end_date,
      daily_summaries: daily_summaries
    }
  end

  @doc """
  Gets macronutrient breakdown for a specific date.
  """
  def get_user_macronutrient_breakdown(user_id, date) do
    summary = get_user_daily_nutrition_summary(user_id, date)

    # Ensure we have valid Decimal values (handle nil cases)
    protein = summary.total_protein || Decimal.new("0")
    carbs = summary.total_carbs || Decimal.new("0")
    total_calories = summary.total_calories || Decimal.new("0")

    # Calculate fat from remaining calories (assuming 4 cal/g for protein and carbs, 9 cal/g for fat)
    protein_calories = Decimal.mult(protein, Decimal.new("4"))
    carbs_calories = Decimal.mult(carbs, Decimal.new("4"))
    remaining_calories = Decimal.sub(total_calories, Decimal.add(protein_calories, carbs_calories))
    fat_grams = Decimal.div(remaining_calories, Decimal.new("9"))

    %{
      protein: Decimal.round(protein, 1),
      carbs: Decimal.round(carbs, 1),
      fat: Decimal.round(Decimal.max(fat_grams, Decimal.new("0")), 1),  # Round to 1 decimal place
      total_calories: Decimal.round(total_calories, 0)  # Round calories to whole numbers
    }
  end

  @doc """
  Gets meal distribution for a specific date.
  """
  def get_user_meal_distribution(user_id, date) do
    FoodEntry
    |> where([f], f.user_id == ^user_id and f.entry_date == ^date)
    |> group_by([f], f.meal_type)
    |> select([f], %{
      meal_type: f.meal_type,
      calories: sum(f.calories),
      food_count: count(f.id)
    })
    |> Repo.all()
    |> Enum.map(fn result ->
      %{
        meal_type: result.meal_type,
        calories: Decimal.round(result.calories || Decimal.new("0"), 0),
        food_count: result.food_count || 0
      }
    end)
    |> Enum.filter(fn meal -> meal.food_count > 0 end)  # Only include meals with actual food entries
  end

  @doc """
  Gets a single food entry for a specific user.
  """
  def get_user_food_entry!(user_id, id) do
    FoodEntry
    |> where([f], f.user_id == ^user_id and f.id == ^id)
    |> Repo.one!()
  end
end
