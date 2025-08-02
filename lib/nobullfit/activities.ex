defmodule Nobullfit.Activities do
  @moduledoc """
  The Activities context.
  """

  import Ecto.Query, warn: false
  alias Nobullfit.Repo
  alias Nobullfit.Activities.Activity

  @doc """
  Returns the list of activities for a user on a specific date.
  """
  def list_user_activities_by_date(user_id, date) do
    Activity
    |> where([a], a.user_id == ^user_id and a.activity_date == ^date)
    |> order_by([a], [desc: a.activity_time, desc: a.inserted_at])
    |> Repo.all()
  end

  @doc """
  Returns the list of activities for a user in a date range.
  """
  def list_user_activities_in_range(user_id, start_date, end_date) do
    Activity
    |> where([a], a.user_id == ^user_id and a.activity_date >= ^start_date and a.activity_date <= ^end_date)
    |> order_by([a], [desc: a.activity_date, desc: a.activity_time])
    |> Repo.all()
  end

  @doc """
  Gets a single activity.

  Raises `Ecto.NoResultsError` if the Activity does not exist.
  """
  def get_activity!(id), do: Repo.get!(Activity, id)

  @doc """
  Gets a single activity for a specific user.
  """
  def get_user_activity!(user_id, id) do
    Activity
    |> where([a], a.user_id == ^user_id and a.id == ^id)
    |> Repo.one!()
  end

  @doc """
  Creates an activity.
  """
  def create_activity(attrs \\ %{}) do
    %Activity{}
    |> Activity.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates an activity.
  """
  def update_activity(%Activity{} = activity, attrs) do
    activity
    |> Activity.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes an activity.
  """
  def delete_activity(%Activity{} = activity) do
    Repo.delete(activity)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking activity changes.
  """
  def change_activity(%Activity{} = activity, attrs \\ %{}) do
    Activity.changeset(activity, attrs)
  end

  @doc """
  Gets summary statistics for a user on a specific date.
  """
  def get_user_daily_summary(user_id, date) do
    activities = list_user_activities_by_date(user_id, date)

    total_calories = Enum.reduce(activities, 0, fn activity, acc -> acc + activity.calories_burned end)
    total_duration = Enum.reduce(activities, 0, fn activity, acc -> acc + activity.duration_minutes end)
    activity_count = length(activities)

    %{
      total_calories: total_calories,
      total_duration: total_duration,
      activity_count: activity_count,
      activities: activities
    }
  end

  @doc """
  Gets weekly summary for a user.
  """
  def get_user_weekly_summary(user_id, start_date) do
    end_date = Date.add(start_date, 6)
    activities = list_user_activities_in_range(user_id, start_date, end_date)

    # Group activities by date
    activities_by_date = Enum.group_by(activities, & &1.activity_date)

    # Calculate daily summaries
    daily_summaries = for date <- Date.range(start_date, end_date) do
      day_activities = Map.get(activities_by_date, date, [])
      total_calories = Enum.reduce(day_activities, 0, fn activity, acc -> acc + activity.calories_burned end)
      total_duration = Enum.reduce(day_activities, 0, fn activity, acc -> acc + activity.duration_minutes end)

      %{
        date: date,
        total_calories: total_calories,
        total_duration: total_duration,
        activity_count: length(day_activities)
      }
    end

    %{
      start_date: start_date,
      end_date: end_date,
      daily_summaries: daily_summaries
    }
  end
end
