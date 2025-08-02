defmodule Nobullfit.Repo.Migrations.CreateActivities do
  use Ecto.Migration

  def change do
    create table(:activities) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :exercise_type, :string, null: false
      add :duration_minutes, :integer, null: false
      add :calories_burned, :integer, null: false
      add :activity_date, :date, null: false
      add :activity_time, :time
      add :notes, :text

      timestamps(type: :utc_datetime)
    end

    create index(:activities, [:user_id])
    create index(:activities, [:activity_date])
    create index(:activities, [:user_id, :activity_date])
  end
end
