defmodule Nobullfit.ActivitiesFixtures do
  @moduledoc """
  This module defines test fixtures for the Activities context.
  """
  alias Nobullfit.Activities

  @doc """
  Generate an activity.
  """
  def activity_fixture(user, attrs \\ %{}) do
    {:ok, activity} =
      attrs
      |> Enum.into(%{
        exercise_type: "Cardio",
        duration_minutes: 30,
        calories_burned: 150,
        activity_date: Date.utc_today(),
        activity_time: Time.utc_now() |> Time.truncate(:second),
        user_id: user.id
      })
      |> Activities.create_activity()

    activity
  end
end
