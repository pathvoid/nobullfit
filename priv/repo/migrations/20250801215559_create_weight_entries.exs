defmodule Nobullfit.Repo.Migrations.CreateWeightEntries do
  use Ecto.Migration

  def change do
    create table(:weight_entries) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :weight, :decimal, null: false
      add :unit, :string, null: false
      add :entry_date, :date, null: false

      timestamps(type: :utc_datetime)
    end

    create index(:weight_entries, [:user_id])
    create index(:weight_entries, [:entry_date])
    create index(:weight_entries, [:user_id, :entry_date])
  end
end
