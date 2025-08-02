defmodule Nobullfit.Activities.Activity do
  use Ecto.Schema
  import Ecto.Changeset

  schema "activities" do
    field :exercise_type, :string
    field :duration_minutes, :integer
    field :calories_burned, :integer
    field :activity_date, :date
    field :activity_time, :time
    field :notes, :string

    belongs_to :user, Nobullfit.Accounts.User

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(activity, attrs) do
    activity
    |> cast(attrs, [:exercise_type, :duration_minutes, :calories_burned, :activity_date, :activity_time, :notes, :user_id])
    |> validate_required([:exercise_type, :duration_minutes, :calories_burned, :activity_date, :user_id])
    |> validate_inclusion(:exercise_type, ["Cardio", "Strength Training", "Yoga", "Running", "Cycling", "Swimming"])
    |> validate_number(:duration_minutes, greater_than: 0, less_than_or_equal_to: 1440)
    |> validate_number(:calories_burned, greater_than_or_equal_to: 0, less_than_or_equal_to: 10000)
    |> validate_date_not_in_future()
    |> foreign_key_constraint(:user_id)
  end

  defp validate_date_not_in_future(changeset) do
    case get_field(changeset, :activity_date) do
      nil -> changeset
      date ->
        today = Date.utc_today()
        if Date.compare(date, today) == :gt do
          add_error(changeset, :activity_date, "cannot be in the future")
        else
          changeset
        end
    end
  end

  def exercise_type_icon(exercise_type) do
    case exercise_type do
      "Cardio" -> "🏃‍♂️"
      "Strength Training" -> "💪"
      "Yoga" -> "🧘‍♀️"
      "Running" -> "🏃‍♂️"
      "Cycling" -> "🚴‍♂️"
      "Swimming" -> "🏊‍♂️"
      _ -> "⚡"
    end
  end
end
