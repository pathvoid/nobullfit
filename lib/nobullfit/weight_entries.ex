defmodule Nobullfit.WeightEntries do
  @moduledoc """
  The WeightEntries context.
  """

  import Ecto.Query, warn: false
  alias Nobullfit.Repo
  alias Nobullfit.WeightEntries.WeightEntry

  @doc """
  Returns the list of weight entries for a user.
  """
  def list_user_weight_entries(user_id) do
    WeightEntry
    |> where(user_id: ^user_id)
    |> order_by([w], desc: w.entry_date, desc: w.inserted_at)
    |> Repo.all()
  end

  @doc """
  Returns the list of weight entries for a user on a specific date.
  """
  def list_user_weight_entries_by_date(user_id, date) do
    WeightEntry
    |> where(user_id: ^user_id, entry_date: ^date)
    |> order_by([w], desc: w.inserted_at)
    |> Repo.all()
  end

  @doc """
  Gets a single weight entry for a user.
  """
  def get_user_weight_entry!(user_id, id) do
    WeightEntry
    |> where(user_id: ^user_id, id: ^id)
    |> Repo.one!()
  end

  @doc """
  Gets the latest weight entry for a user.
  """
  def get_user_latest_weight_entry(user_id) do
    WeightEntry
    |> where(user_id: ^user_id)
    |> order_by([w], desc: w.entry_date, desc: w.inserted_at)
    |> limit(1)
    |> Repo.one()
  end

  @doc """
  Gets the previous weight entry for a user (before the given entry).
  """
  def get_user_previous_weight_entry(user_id, current_entry) do
    WeightEntry
    |> where(user_id: ^user_id)
    |> where([w], w.entry_date < ^current_entry.entry_date)
    |> order_by([w], desc: w.entry_date, desc: w.inserted_at)
    |> limit(1)
    |> Repo.one()
  end

  @doc """
  Creates a weight entry.
  """
  def create_weight_entry(attrs \\ %{}) do
    %WeightEntry{}
    |> WeightEntry.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a weight entry.
  """
  def update_weight_entry(%WeightEntry{} = weight_entry, attrs) do
    weight_entry
    |> WeightEntry.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a weight entry.
  """
  def delete_weight_entry(%WeightEntry{} = weight_entry) do
    Repo.delete(weight_entry)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking weight entry changes.
  """
  def change_weight_entry(%WeightEntry{} = weight_entry, attrs \\ %{}) do
    WeightEntry.changeset(weight_entry, attrs)
  end

  @doc """
  Gets the user's preferred unit based on their last entry.
  """
  def get_user_preferred_unit(user_id) do
    case get_user_latest_weight_entry(user_id) do
      nil -> "kg"  # Default to kg if no previous entries
      entry -> entry.unit
    end
  end

    @doc """
  Gets weight summary for display (current weight and difference).
  """
  def get_user_weight_summary(user_id) do
    latest_entry = get_user_latest_weight_entry(user_id)

    case latest_entry do
      nil ->
        %{current_weight: nil, difference: nil, unit: nil}

      entry ->
        previous_entry = get_user_previous_weight_entry(user_id, entry)

        difference = case previous_entry do
          nil -> nil
          prev -> WeightEntry.weight_difference(entry, prev)
        end

        %{
          current_weight: entry.weight,
          difference: difference,
          unit: entry.unit
        }
    end
  end

  @doc """
  Gets weight summary for a specific date.
  """
  def get_user_weight_summary_for_date(user_id, date) do
    # Get the weight entry for the specific date
    entries_for_date = list_user_weight_entries_by_date(user_id, date)

    case entries_for_date do
      [] ->
        # No weight entry for this date, return nil
        %{current_weight: nil, difference: nil, unit: nil}

      [entry | _] ->
        # Get the previous entry (before this date) for difference calculation
        previous_entry = get_user_previous_weight_entry(user_id, entry)

        difference = case previous_entry do
          nil -> nil
          prev -> WeightEntry.weight_difference(entry, prev)
        end

        %{
          current_weight: entry.weight,
          difference: difference,
          unit: entry.unit
        }
    end
  end
end
