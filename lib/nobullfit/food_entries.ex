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
  Gets a single food entry for a specific user.
  """
  def get_user_food_entry!(user_id, id) do
    FoodEntry
    |> where([f], f.user_id == ^user_id and f.id == ^id)
    |> Repo.one!()
  end
end
